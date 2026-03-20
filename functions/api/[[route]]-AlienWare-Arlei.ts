import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

const RESEND_API_KEY = "re_KjqCEJSb_Pgca8L7Py7cU8fNEGwe7idKz";

const sendEmail = async (to: string[], subject: string, title: string, content: string, ticketId?: string | number) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; padding: 40px 20px; margin: 0 auto; }
          .header { background-color: #0f172a; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
          .brand { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; margin: 0; }
          .brand span { color: #3b82f6; }
          .content { background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none; }
          .ticket-badge { display: inline-block; background-color: #eff6ff; color: #2563eb; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 20px; }
          h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.025em; }
          p { margin-bottom: 24px; color: #64748b; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
          .button { display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p class="brand">OPERARUM <span>SO</span></p>
          </div>
          <div class="content">
            ${ticketId ? `<div class="ticket-badge">Protocolo #${ticketId}</div>` : ''}
            <h1>${title}</h1>
            <p>${content}</p>
            <a href="https://chamadosoperarum.pages.dev" class="button">Acessar Painel</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Operarum SO. Este é um e-mail automático, por favor não responda.
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Operarum SO <os@operarum.com.br>',
        to: to.length === 1 ? to[0] : to,
        subject: `[Operarum SO] ${subject}`,
        html
      })
    });

    const data = await res.json() as any;
    if (!res.ok) {
      console.error("[RESEND ERROR]", data);
    } else {
      console.log("[RESEND SUCCESS]", data.id);
    }
  } catch (error) {
    console.error("Email Error:", error);
  }
};

app.post('/auth/sync', async (c) => {
  try {
    let { clerkId, email, name, role } = await c.req.json();
    const db = c.env.DB;

    // Hardcode SUPER-ADMIN rules
    const targetEmail = email?.toLowerCase() || '';
    const targetName = name?.toLowerCase() || '';
    const isSuperAdmin = targetEmail === 'ti@venancio.eco.br';
    
    if (isSuperAdmin) {
      role = 'admin';
    }

    // Check if user exists by clerk_id
    let user = await db.prepare("SELECT * FROM users WHERE clerk_id = ?").bind(clerkId).first();

    // Force update if they are already in DB but don't have the admin role
    if (user && isSuperAdmin && user.role !== 'admin') {
      await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
      user.role = 'admin';
    }

    if (!user) {
      // Check if user exists by email (for initial seed data migration)
      user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

      if (user) {
        if (isSuperAdmin) role = 'admin';
        // Update existing user with clerk_id and role
        await db.prepare("UPDATE users SET clerk_id = ?, name = ?, role = ? WHERE id = ?").bind(clerkId, name, role, user.id).run();
        user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
      } else {
        // Create new user
        const stmt = db.prepare("INSERT INTO users (clerk_id, name, email, role) VALUES (?, ?, ?, ?) RETURNING *");
        const info = await stmt.bind(clerkId, name, email, role).first();
        user = info;
      }
    }

    return c.json(user);
  } catch (error) {
    console.error("Error syncing user:", error);
    return c.json({ error: "Failed to sync user" }, 500);
  }
});

app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM users ORDER BY name").all();
  return c.json(results || []);
});

app.post('/users', async (c) => {
  const { name, email, role, company } = await c.req.json();
  const stmt = c.env.DB.prepare("INSERT INTO users (name, email, role, company) VALUES (?, ?, ?, ?) RETURNING *");
  const info = await stmt.bind(name, email, role, company).first();
  return c.json(info);
});

app.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, email, role, company, photo_data } = await c.req.json();
    await c.env.DB.prepare("UPDATE users SET name = ?, email = ?, role = ?, company = ?, photo_data = ? WHERE id = ?").bind(name, email, role, company, photo_data, id).run();
    return c.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE') || error.message?.includes('constraint')) {
      return c.json({ error: "Este e-mail já está sendo usado por outro usuário." }, 409);
    }
    return c.json({ error: "Erro interno no servidor" }, 500);
  }
});

// Notifications Management
app.get('/notifications', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? AND is_read = 0 
    ORDER BY id DESC
  `).bind(userId).all();
  
  return c.json(results || []);
});

app.put('/notifications/:id/read', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

app.put('/notifications/read-all', async (c) => {
  const { userId } = await c.req.json();
  await c.env.DB.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").bind(userId).run();
  return c.json({ success: true });
});

async function createNotification(db: D1Database, userId: number, title: string, message: string, type: 'info' | 'success' | 'warning' = 'info', ticketId?: string | number) {
  await db.prepare("INSERT INTO notifications (user_id, title, message, type, ticket_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)").bind(userId, title, message, type, ticketId).run();
}

app.delete('/users/:id', async (c) => {
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ success: true });
});

// Settings Management
app.get('/sectors', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM sectors ORDER BY name").all();
  return c.json(results || []);
});

app.post('/sectors', async (c) => {
  const { name } = await c.req.json();
  const stmt = c.env.DB.prepare("INSERT INTO sectors (name) VALUES (?) RETURNING *");
  const info = await stmt.bind(name).first();
  return c.json(info);
});

app.put('/sectors/:id', async (c) => {
  const id = c.req.param('id');
  const { name } = await c.req.json();
  await c.env.DB.prepare("UPDATE sectors SET name = ? WHERE id = ?").bind(name, id).run();
  return c.json({ success: true });
});

app.delete('/sectors/:id', async (c) => {
  await c.env.DB.prepare("DELETE FROM sectors WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.get('/service-types', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT st.*, s.name as sector_name 
    FROM service_types st 
    LEFT JOIN sectors s ON st.sector_id = s.id 
    ORDER BY st.name
  `).all();
  return c.json(results || []);
});

app.post('/service-types', async (c) => {
  const { name, sector_id } = await c.req.json();
  const stmt = c.env.DB.prepare("INSERT INTO service_types (name, sector_id) VALUES (?, ?) RETURNING *");
  const info = await stmt.bind(name, sector_id).first();
  return c.json(info);
});

app.put('/service-types/:id', async (c) => {
  const id = c.req.param('id');
  const { name, sector_id } = await c.req.json();
  await c.env.DB.prepare("UPDATE service_types SET name = ?, sector_id = ? WHERE id = ?").bind(name, sector_id, id).run();
  return c.json({ success: true });
});

app.delete('/service-types/:id', async (c) => {
  await c.env.DB.prepare("DELETE FROM service_types WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.get('/companies', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM companies ORDER BY name").all();
  return c.json(results || []);
});

app.post('/companies', async (c) => {
  const { name } = await c.req.json();
  const stmt = c.env.DB.prepare("INSERT INTO companies (name) VALUES (?) RETURNING *");
  const info = await stmt.bind(name).first();
  return c.json(info);
});

app.put('/companies/:id', async (c) => {
  const id = c.req.param('id');
  const { name } = await c.req.json();
  await c.env.DB.prepare("UPDATE companies SET name = ? WHERE id = ?").bind(name, id).run();
  return c.json({ success: true });
});

app.delete('/companies/:id', async (c) => {
  await c.env.DB.prepare("DELETE FROM companies WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.get('/tickets', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, c.name as client_name, p.name as provider_name
    FROM tickets t
    LEFT JOIN users c ON t.client_id = c.id
    LEFT JOIN users p ON t.provider_id = p.id
    ORDER BY t.created_at DESC
  `).all();
  return c.json(results || []);
});

app.get('/tickets/:id', async (c) => {
  const id = c.req.param('id');
  const ticket = await c.env.DB.prepare(`
    SELECT t.*, c.name as client_name, p.name as provider_name
    FROM tickets t
    LEFT JOIN users c ON t.client_id = c.id
    LEFT JOIN users p ON t.provider_id = p.id
    WHERE t.id = ?
  `).bind(id).first();

  if (!ticket) return c.json({ error: "Ticket not found" }, 404);

  const { results: comments } = await c.env.DB.prepare(`
    SELECT c.*, u.name as user_name, u.role as user_role
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
  `).bind(id).all();

  const { results: photos } = await c.env.DB.prepare(`
    SELECT photo_data, photo_type FROM ticket_photos WHERE ticket_id = ?
  `).bind(id).all();

  return c.json({
    ...ticket,
    comments: comments || [],
    photos: photos ? photos.filter(p => p.photo_type === 'opening').map(p => p.photo_data) : [],
    final_photos: photos ? photos.filter(p => p.photo_type === 'final').map(p => p.photo_data) : []
  });
});

app.post('/tickets', async (c) => {
 try {
  const body = await c.req.json();
  const id = body.id || null;
  const title = body.title || "";
  const description = body.description || "";
  const location = body.location || "";
  const priority = body.priority || "Média";
  const type = body.type || "";
  const sector = body.sector || "";
  const company = body.company || "";
  const client_id = body.client_id || null;
  const requestor_name = body.requestor_name || "";
  const phone = body.phone || "";
  const sub_type = body.sub_type || "";
  const preferred_time = body.preferred_time || "Qualquer Horário";
  const provider_id = body.provider_id || null;
  const external_id = body.external_id || null;
  const photos = body.photos || [];
  
  const status = provider_id ? 'Em Atendimento' : 'Em Aberto'; // Standard INSERT without manual ID (let D1/SQLite autoincrement handle it)
  let stmt;
  let bindParams: any[];

  if (id) {
    stmt = c.env.DB.prepare(`
      INSERT INTO tickets (
        id, title, description, location, priority, type, sector, 
        company, client_id, requestor_name, phone, sub_type, preferred_time, provider_id, status, external_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `);
    bindParams = [
      id, title, description, location, priority, type, sector, 
      company, client_id, requestor_name, phone, sub_type, preferred_time, provider_id, status, external_id
    ];
  } else {
    stmt = c.env.DB.prepare(`
      INSERT INTO tickets (
        title, description, location, priority, type, sector, 
        company, client_id, requestor_name, phone, sub_type, preferred_time, provider_id, status, external_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `);
    bindParams = [
      title, description, location, priority, type, sector, 
      company, client_id, requestor_name, phone, sub_type, preferred_time, provider_id, status, external_id
    ];
  }
  
  // Check for duplicate external_id early if provided
  if (external_id) {
    const existing = await c.env.DB.prepare("SELECT id FROM tickets WHERE external_id = ?").bind(external_id).first();
    if (existing) {
      return c.json({ error: "Este chamado já está registrado (OS já existe)." }, 409);
    }
  }
  
  const info = await stmt.bind(...bindParams).first();
  const ticketId = info?.id;

  if (ticketId) {
    // Email logic for production
    const db = c.env.DB;
    const client = await db.prepare("SELECT email FROM users WHERE id = ?").bind(client_id).first() as any;
    const { results: staff } = await db.prepare("SELECT email FROM users WHERE role IN ('provider', 'admin')").all() as any;
    
    if (client && client.email) {
      const staffEmails = staff 
        ? staff.map((s: any) => s.email).filter((e: string) => e && e !== client.email) 
        : [];
      const recipients = [client.email, ...staffEmails];
      
      console.log(`[EMAIL] Enviando para: ${recipients.join(', ')}`);
      
      c.executionCtx.waitUntil(sendEmail(
        recipients, 
        `Novo Chamado: ${title}`,
        "Novo Chamado Registrado",
        `Olá!<br><br>Um novo chamado foi registrado com sucesso.<br><br>
        <strong>Detalhes:</strong><br>
        - Protocolo: #${ticketId}<br>
        - Assunto: ${title}<br>
        - Setor: ${sector || 'Não informado'}<br>
        - Prioridade: ${priority}<br><br>
        Você pode acompanhar o andamento pelo nosso portal.`,
        ticketId as number
      ));
    }

    // Criar notificações internas para admins e prestadores
    const { results: allStaff } = await db.prepare("SELECT id FROM users WHERE role IN ('provider', 'admin')").all() as any;
    if (allStaff) {
      for (const s of allStaff) {
        if (s.id !== client_id) {
          c.executionCtx.waitUntil(createNotification(db, s.id, "Novo Chamado", `Protocolo #${ticketId}: ${title}`, 'info', ticketId as any));
        }
      }
    }
  }

  if (ticketId && photos && Array.isArray(photos) && photos.length > 0) {
    const stmts = photos.map(photo => 
      c.env.DB.prepare("INSERT INTO ticket_photos (ticket_id, photo_data, photo_type) VALUES (?, ?, 'opening')").bind(ticketId, photo)
    );
    await c.env.DB.batch(stmts);
  }

    return c.json({ id: ticketId });
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    
    // Better error messages for common D1/SQLite failures
    const errorMessage = error.message || "";
    if (errorMessage.includes("UNIQUE") || errorMessage.includes("external_id") || errorMessage.includes("id")) {
      return c.json({ error: "Este chamado já foi registrado anteriormente (OS duplicada)." }, 409);
    }
    if (errorMessage.includes("FOREIGN KEY") || errorMessage.includes("client_id")) {
      return c.json({ error: "Erro de relacionamento: Usuário ou cliente não encontrado." }, 400);
    }
    
    return c.json({ error: "Erro interno ao cadastrar chamado: " + (error.message || "Tente novamente mais tarde") }, 500);
  }
});

app.put('/tickets/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status, provider_id, final_report, final_photos } = await c.req.json();
  
  let query = "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP";
  const params: any[] = [status];
  
  if (provider_id) {
    query += ", provider_id = ?";
    params.push(provider_id);
  }

  if (final_report) {
    query += ", final_report = ?";
    params.push(final_report);
  }
  
  query += " WHERE id = ?";
  params.push(id);

  await c.env.DB.prepare(query).bind(...params).run();

  // Email update for production
  const db = c.env.DB;
  const ticket = await db.prepare(`
    SELECT t.title, c.email as client_email, p.email as provider_email 
    FROM tickets t 
    LEFT JOIN users c ON t.client_id = c.id
    LEFT JOIN users p ON t.provider_id = p.id
    WHERE t.id = ?
  `).bind(id).first() as any;

  if (ticket) {
    const recipients = [ticket.client_email];
    if (ticket.provider_email) recipients.push(ticket.provider_email);
    
    // Enviar e-mail APENAS se estiver finalizando ou cancelando
    if (status === 'Finalizado' || status === 'Cancelado') {
      c.executionCtx.waitUntil(sendEmail(
        recipients,
        `Chamado Encerrado: ${ticket.title}`,
        status === 'Finalizado' ? "Chamado Finalizado" : "Chamado Cancelado",
        `Olá!<br><br>O seu chamado <strong>${ticket.title}</strong> foi marcado como: <strong>${status}</strong>.<br><br>
        ${final_report ? `<strong>Relatório Final:</strong><br>${final_report}<br><br>` : ''}
        Acesse o portal para mais detalhes.`,
        id as string
      ));
    }

    // Sempre criar notificação interna
    const notificationTitle = status === 'Finalizado' ? "Chamado Finalizado" : 
                             status === 'Cancelado' ? "Chamado Cancelado" : "Status Atualizado";
    const notificationType = status === 'Finalizado' ? 'success' : 
                            status === 'Cancelado' ? 'warning' : 'info';

    // Notificar o cliente
    const { client_id } = await db.prepare("SELECT client_id FROM tickets WHERE id = ?").bind(id).first() as any;
    c.executionCtx.waitUntil(createNotification(db, client_id, notificationTitle, `Protocolo #${id}: ${status}`, notificationType, id));
    
    // Notificar o prestador se existir e não for quem alterou (simplificado: notifica se existir)
    const { provider_id: ticketProviderId } = await db.prepare("SELECT provider_id FROM tickets WHERE id = ?").bind(id).first() as any;
    if (ticketProviderId) {
      c.executionCtx.waitUntil(createNotification(db, ticketProviderId, notificationTitle, `Protocolo #${id}: ${status}`, notificationType, id));
    }
  }

  if (status === 'Finalizado' && final_photos && Array.isArray(final_photos) && final_photos.length > 0) {
    const stmts = final_photos.map(photo => 
      c.env.DB.prepare("INSERT INTO ticket_photos (ticket_id, photo_data, photo_type) VALUES (?, ?, 'final')").bind(id, photo)
    );
    await c.env.DB.batch(stmts);
  }

  return c.json({ success: true });
});

app.put('/tickets/:id/reopen', async (c) => {
  const id = c.req.param('id');
  const { reopen_reason } = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE tickets 
    SET status = 'Em Aberto', reopen_reason = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(reopen_reason, id).run();
  
  return c.json({ success: true });
});

app.put('/tickets/:id/assign', async (c) => {
  const id = c.req.param('id');
  const { provider_id } = await c.req.json();
  await c.env.DB.prepare("UPDATE tickets SET provider_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(provider_id, id).run();
  return c.json({ success: true });
});

app.put('/tickets/:id/sector', async (c) => {
  const id = c.req.param('id');
  const { sector } = await c.req.json();
  await c.env.DB.prepare("UPDATE tickets SET sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sector, id).run();
  return c.json({ success: true });
});

app.put('/tickets/:id/nps', async (c) => {
  const id = c.req.param('id');
  const { nps_score } = await c.req.json();
  await c.env.DB.prepare("UPDATE tickets SET nps_score = ? WHERE id = ?").bind(nps_score, id).run();
  return c.json({ success: true });
});

app.post('/tickets/:id/comments', async (c) => {
  const id = c.req.param('id');
  const { user_id, message } = await c.req.json();
  
  const stmt = c.env.DB.prepare("INSERT INTO comments (ticket_id, user_id, message) VALUES (?, ?, ?) RETURNING id");
  const info = await stmt.bind(id, user_id, message).first();
  
  if (info) {
    const db = c.env.DB;
    const ticket = await db.prepare(`
      SELECT t.client_id, t.provider_id, t.title, c.email as client_email, p.email as provider_email 
      FROM tickets t 
      LEFT JOIN users c ON t.client_id = c.id
      LEFT JOIN users p ON t.provider_id = p.id
      WHERE t.id = ?
    `).bind(id).first() as any;

    if (ticket) {
      const recipientEmail = user_id === ticket.client_id ? ticket.provider_email : ticket.client_email;
      const recipientId = user_id === ticket.client_id ? ticket.provider_id : ticket.client_id;
      
      // Criar APENAS notificação interna para comentários (sem e-mail para economizar limite)
      if (recipientId) {
        c.executionCtx.waitUntil(createNotification(
          db, 
          recipientId, 
          "Novo Comentário", 
          `Chamado #${id}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 
          'info',
          id
        ));

        // Auto-update status to "Em Atendimento" if it's "Em Aberto"
        const ticketData = await db.prepare("SELECT status, client_id, provider_id FROM tickets WHERE id = ?").bind(id).first() as any;
        
        if (ticketData?.status === 'Em Aberto') {
          // If the responder is NOT the client, they are the provider
          const isProvider = user_id !== ticketData.client_id;
          
          if (isProvider) {
            await db.prepare("UPDATE tickets SET status = 'Em Atendimento', provider_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .bind(user_id, id)
              .run();
          } else {
            await db.prepare("UPDATE tickets SET status = 'Em Atendimento', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .bind(id)
              .run();
          }
          
          // Also notify the client about the status change internally
          c.executionCtx.waitUntil(createNotification(db, ticketData.client_id, "Status Atualizado", `Protocolo #${id}: Em Atendimento`, 'info', id));
        }
      }
    }
  }

  return c.json({ id: info?.id });
});

app.delete('/tickets/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.req.query('userId');
    const userRole = c.req.query('userRole');

    // 1. Fetch ticket to check ownership
    const ticket = await c.env.DB.prepare("SELECT client_id FROM tickets WHERE id = ?").bind(id).first() as any;
    if (!ticket) {
      return c.json({ error: "Chamado não encontrado" }, 404);
    }

    // 2. Check permissions
    const isOwner = userId && Number(userId) === ticket.client_id;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return c.json({ error: "Você não tem permissão para excluir este chamado" }, 403);
    }

    // 3. Delete in batch
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM comments WHERE ticket_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM ticket_photos WHERE ticket_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM tickets WHERE id = ?").bind(id)
    ]);

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete Ticket Error:", error);
    return c.json({ error: "Erro ao excluir chamado" }, 500);
  }
});

app.get('/dashboard', async (c) => {
  const db = c.env.DB;

  // 1. Opinião (NPS) - Distribution
  const { results: opinionDist } = await db.prepare(`
    SELECT 
      CASE 
        WHEN nps_score >= 9 THEN 'Promotores' 
        WHEN nps_score >= 7 THEN 'Neutros' 
        ELSE 'Detratores' 
      END as name,
      COUNT(*) as value 
    FROM tickets 
    WHERE nps_score IS NOT NULL 
    GROUP BY name
  `).all();

  // 2. Resolução de Problemas
  const { results: resolutionStats } = await db.prepare(`
    SELECT status as name, COUNT(*) as value FROM tickets GROUP BY status
  `).all();

  // 3. Criados x Finalizados por Período
  // Note: Recursive CTE might be limited in some D1 environments, but works in modern SQLite
  const { results: backlogData } = await db.prepare(`
    WITH RECURSIVE dates(date) AS (
      SELECT date('now', '-30 days')
      UNION ALL
      SELECT date(date, '+1 day') FROM dates WHERE date < date('now')
    )
    SELECT 
      d.date as name,
      (SELECT COUNT(*) FROM tickets t WHERE date(t.created_at) = d.date) as created,
      (SELECT COUNT(*) FROM tickets t WHERE date(t.updated_at) = d.date AND t.status = 'Finalizado') as finished
    FROM dates d
  `).all();

  // 4. Deadline & Initiation (Zeroed until SLA logic is implemented)
  const deadlineStats = [{ name: 'No Prazo', value: 0 }, { name: 'Atrasado', value: 0 }];
  const initiationStats = [{ name: 'Cumprida', value: 0 }, { name: 'Não Cumprida', value: 0 }];

  // 6. Campos Personalizados (Distribution by Location)
  const { results: customFieldsDist } = await db.prepare(`
    SELECT location as name, COUNT(*) as value FROM tickets GROUP BY location
  `).all();

  // 7. Dia da Semana (Real data from DB)
  const { results: rawTimeDist } = await db.prepare(`
    SELECT 
      CASE strftime('%w', created_at)
        WHEN '0' THEN 'Domingo'
        WHEN '1' THEN 'Segunda'
        WHEN '2' THEN 'Terça'
        WHEN '3' THEN 'Quarta'
        WHEN '4' THEN 'Quinta'
        WHEN '5' THEN 'Sexta'
        WHEN '6' THEN 'Sábado'
      END as name,
      COUNT(*) as value
    FROM tickets
    WHERE created_at >= date('now', '-30 days')
    GROUP BY name
  `).all();

  const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const timeDistribution = daysOrder.map(day => ({
    name: day,
    value: (rawTimeDist?.find((r: any) => r.name === day) as any)?.value || 0
  }));

  // 8. Tempos Médios/Totais (Disabled as per user request to remove efficiency metrics)
  const timeStats = {
    avgClosing: 0,
    totalClosing: 0,
    avgWorking: 0,
    totalWorking: 0,
    avgWaiting: 0,
    totalResponseWork: 0
  };


  // 10. Reabertura
  const reopens = await db.prepare("SELECT COUNT(*) as count FROM tickets WHERE reopen_reason IS NOT NULL").first() as any;

  // 11. Chamados Abertos
  const openTickets = await db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Em Aberto'").first() as any;

  // 12. SLA por Atendente
  const { results: slaData } = await db.prepare(`
    SELECT u.name, AVG(julianday(t.updated_at) - julianday(t.created_at)) * 24 as avg_hours
    FROM tickets t
    JOIN users u ON t.provider_id = u.id
    WHERE t.status = 'Finalizado'
    GROUP BY u.name
  `).all();

  // 13. Opinião (Real average from DB)
  const avgNps = await db.prepare("SELECT AVG(nps_score) as avg FROM tickets WHERE nps_score IS NOT NULL").first() as any;
  const opinionTimeline = [
    { name: 'Média Atual', value: avgNps?.avg ? parseFloat(avgNps.avg.toFixed(1)) : 0 }
  ];

  const { results: byType } = await db.prepare("SELECT type as name, COUNT(*) as value FROM tickets GROUP BY type").all();
  const { results: byCompany } = await db.prepare("SELECT IFNULL(company, 'Não Informada') as name, COUNT(*) as value FROM tickets GROUP BY company").all();

  return c.json({
    opinionDist: opinionDist || [],
    resolutionStats: resolutionStats || [],
    backlogData: backlogData || [],
    deadlineStats,
    initiationStats,
    customFieldsDist: customFieldsDist || [],
    timeDistribution,
    timeStats,
    reopens: reopens?.count || 0,
    openTickets: openTickets?.count || 0,
    slaData: slaData || [],
    opinionTimeline,
    byType: byType || [],
    byCompany: byCompany || []
  });
});

import { handle } from 'hono/cloudflare-pages';
export const onRequest = handle(app);
