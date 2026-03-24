import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend("re_KjqCEJSb_Pgca8L7Py7cU8fNEGwe7idKz");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(":memory:"); // Using in-memory SQLite for preview

// Initialize DB Schema
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clerk_id TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company TEXT
  );

  CREATE TABLE tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    priority TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Em Aberto',
    client_id INTEGER NOT NULL,
    provider_id INTEGER,
    nps_score INTEGER,
    external_id TEXT,
    materials TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users (id),
    FOREIGN KEY (provider_id) REFERENCES users (id)
  );

  CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE ticket_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    photo_data TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
  );

  CREATE TABLE sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    email TEXT
  );

  CREATE TABLE service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sector_id INTEGER,
    FOREIGN KEY (sector_id) REFERENCES sectors (id)
  );

  CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Seed Initial Data
// Seed Initial Data
db.exec(`
  INSERT INTO sectors (name, email) VALUES 
  ('Manutenção', 'manutencao@operarum.com'), 
  ('TI', 'suporte.ti@operarum.com'), 
  ('Limpeza', 'limpeza@operarum.com'), 
  ('Segurança', 'seguranca@operarum.com');
  INSERT INTO service_types (name, sector_id) VALUES 
  ('Civil', 1), ('Elétrica', 1), ('Hidráulica', 1), ('Ar Condicionado', 1), ('Pintura', 1),
  ('Software', 2), ('Hardware', 2), ('Redes', 2),
  ('Limpeza Geral', 3), ('Resíduos', 3),
  ('Portaria', 4), ('Vigilância', 4);
  INSERT INTO companies (name) VALUES 
  ('SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL'),
  ('REPRESENTAÇÃO DO ESTADO DO MARANHÃO'),
  ('SUPERINTENDENCIA NACIONAL DE PREVIDENCIA COMPLEMENTAR - PREVIC'),
  ('AGENCIA NACIONAL DE PROTEÇÃO DE DADOS -ANPD'),
  ('COMPANHIA DE DESENVOLVIMENTO DE MARICÁ -CODEMAR'),
  ('FORD COMPANY'),
  ('ANTONIO VENÃNCIO DA SILVA EMPREENDIMENTOS IMOBILIÁRIOS LTDA'),
  ('CONSELHO NACIONAL DE SECRETARIAS DE SAUDE');
`);

const insertUser = db.prepare("INSERT INTO users (name, role, email, company) VALUES (?, ?, ?, ?)");
insertUser.run("Condômino", "client", "cliente@operarum.com", "FORD COMPANY");
insertUser.run("Operarum", "provider", "tecnico@operarum.com", "ANTONIO VENÃNCIO DA SILVA EMPREENDIMENTOS IMOBILIÁRIOS LTDA");
insertUser.run("Administrador", "admin", "admin@operarum.com", "SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL");

// Also seed the user's email so they can see tickets
insertUser.run("Arlei", "admin", "arlei.bsb@gmail.com", "SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use(express.json());

  // Notification Helper
  const createNotification = (userId: number, title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    db.prepare("INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)").run(userId, title, message, type);
  };

  // Email Helper with Templates
  const sendEmail = async (to: string[], subject: string, title: string, content: string, ticketId?: string | number) => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; mx-auto; padding: 40px 20px; }
            .header { background-color: #0f172a; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
            .logo { height: 40px; margin-bottom: 10px; }
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

      await resend.emails.send({
        from: 'Operarum SO <notifications@operarum.com.br>',
        to,
        subject: `[Operarum SO] ${subject}`,
        html
      });
      console.log(`[EMAIL SENT] To: ${to.join(', ')} | Subject: ${subject}`);
    } catch (error) {
      console.error("[EMAIL ERROR]", error);
    }
  };

  // API Routes
  app.post("/api/auth/sync", (req, res) => {
    try {
      const { clerkId, email, name, role } = req.body;
      
      // Check if user exists by clerk_id
      let user = db.prepare("SELECT * FROM users WHERE clerk_id = ?").get(clerkId);
      
      if (!user) {
        // Check if user exists by email (for initial seed data migration)
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        
        if (user) {
          // Update existing user with clerk_id and role
          db.prepare("UPDATE users SET clerk_id = ?, name = ?, role = ? WHERE id = ?").run(clerkId, name, role, (user as any).id);
          user = db.prepare("SELECT * FROM users WHERE id = ?").get((user as any).id);
        } else {
          // Create new user
          const stmt = db.prepare("INSERT INTO users (clerk_id, name, email, role) VALUES (?, ?, ?, ?)");
          const info = stmt.run(clerkId, name, email, role);
          user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  app.get("/api/users", (req, res) => {
    res.json(db.prepare("SELECT * FROM users ORDER BY name").all());
  });

  app.post("/api/users", (req, res) => {
    const { name, email, role, company } = req.body;
    const stmt = db.prepare("INSERT INTO users (name, email, role, company) VALUES (?, ?, ?, ?)");
    const info = stmt.run(name, email, role, company);
    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    res.json(newUser);
  });

  app.put("/api/users/:id", (req, res) => {
    try {
      const { name, email, role, company } = req.body;
      db.prepare("UPDATE users SET name = ?, email = ?, role = ?, company = ? WHERE id = ?").run(name, email, role, company, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: "Este e-mail já está sendo usado por outro usuário." });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erro interno ao salvar usuário." });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/sectors", (req, res) => {
    res.json(db.prepare("SELECT * FROM sectors ORDER BY name").all());
  });

  app.post("/api/sectors", (req, res) => {
    const { name } = req.body;
    const stmt = db.prepare("INSERT INTO sectors (name) VALUES (?)");
    const info = stmt.run(name);
    res.json({ id: info.lastInsertRowid, name });
  });

  app.put("/api/sectors/:id", (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE sectors SET name = ? WHERE id = ?").run(name, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/sectors/:id", (req, res) => {
    db.prepare("DELETE FROM sectors WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/service-types", (req, res) => {
    res.json(db.prepare(`
      SELECT st.*, s.name as sector_name 
      FROM service_types st 
      LEFT JOIN sectors s ON st.sector_id = s.id 
      ORDER BY st.name
    `).all());
  });

  app.post("/api/service-types", (req, res) => {
    const { name, sector_id } = req.body;
    const stmt = db.prepare("INSERT INTO service_types (name, sector_id) VALUES (?, ?)");
    const info = stmt.run(name, sector_id);
    res.json({ id: info.lastInsertRowid, name, sector_id });
  });

  app.put("/api/service-types/:id", (req, res) => {
    const { name, sector_id } = req.body;
    db.prepare("UPDATE service_types SET name = ?, sector_id = ? WHERE id = ?").run(name, sector_id, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/service-types/:id", (req, res) => {
    db.prepare("DELETE FROM service_types WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/companies", (req, res) => {
    res.json(db.prepare("SELECT * FROM companies ORDER BY name").all());
  });

  app.post("/api/companies", (req, res) => {
    const { name } = req.body;
    const stmt = db.prepare("INSERT INTO companies (name) VALUES (?)");
    const info = stmt.run(name);
    res.json({ id: info.lastInsertRowid, name });
  });

  app.put("/api/companies/:id", (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE companies SET name = ? WHERE id = ?").run(name, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/companies/:id", (req, res) => {
    db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/tickets", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.*, c.name as client_name, p.name as provider_name
      FROM tickets t
      LEFT JOIN users c ON t.client_id = c.id
      LEFT JOIN users p ON t.provider_id = p.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tickets);
  });

  app.get("/api/tickets/:id", (req, res) => {
    const ticket = db.prepare(`
      SELECT t.*, c.name as client_name, p.name as provider_name
      FROM tickets t
      LEFT JOIN users c ON t.client_id = c.id
      LEFT JOIN users p ON t.provider_id = p.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);

    const photos = db.prepare(`
      SELECT photo_data FROM ticket_photos WHERE ticket_id = ?
    `).all(req.params.id);

    res.json({ 
      ...(ticket as any),
      comments, 
      photos: photos.map((p: any) => p.photo_data),
      materials: (ticket as any).materials
    });
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      const { id, title, description, location, priority, type, sector, company, client_id, photos, external_id } = req.body;
    
    // Fetch sector email if available
    const sectorInfo = sector ? db.prepare("SELECT email FROM sectors WHERE name = ?").get(sector) as any : null;
    if (sectorInfo && sectorInfo.email) {
      console.log(`[SIMULATED EMAIL] Notificação enviada para o Setor ${sector}: ${sectorInfo.email}`);
    }

    // Use a conditional SQL based on whether ID is provided (for SEEDF OS numbers)
    let stmt: any;
    if (id) {
      stmt = db.prepare(`
        INSERT INTO tickets (id, title, description, location, priority, type, sector, company, client_id, external_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
    } else {
      stmt = db.prepare(`
        INSERT INTO tickets (title, description, location, priority, type, sector, company, client_id, external_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
    }
   
    // Run in a transaction to ensure both ticket and photos are saved
    const transaction = db.transaction(() => {
      let info;
      if (id) {
        info = stmt.run(id, title, description, location, priority, type, sector, company, client_id, external_id);
      } else {
        info = stmt.run(title, description, location, priority, type, sector, company, client_id, external_id || null);
      }
      const ticketId = info.lastInsertRowid;
    
      if (photos && Array.isArray(photos) && photos.length > 0) {
        const insertPhoto = db.prepare("INSERT INTO ticket_photos (ticket_id, photo_data, photo_type) VALUES (?, ?, 'opening')");
        for (const photo of photos) {
          insertPhoto.run(ticketId, photo);
        }
      }
      
      return ticketId;
    });

    const newTicketId = transaction();
    
    // Fetch user and sector info for email
    const client = db.prepare("SELECT name, email FROM users WHERE id = ?").get(client_id) as any;
    
    // Notify all providers and admins about the new ticket
    const staff = db.prepare("SELECT id, email FROM users WHERE role IN ('provider', 'admin')").all() as any[];
    for (const member of staff) {
      createNotification(member.id, "Novo Chamado Registrado", `Um novo chamado (#${newTicketId}) foi aberto: ${title}`, 'info');
    }

    // Professional Email Notification
    if (client) {
      const staffEmails = staff.map(s => s.email).filter(e => e !== client.email);
      const allRecipients = [client.email, ...staffEmails];
      
      sendEmail(
        allRecipients,
        `Novo Chamado: ${title}`,
        "Novo Chamado Registrado",
        `Olá!<br><br>Um novo chamado foi registrado com sucesso.<br><br>
        <strong>Detalhes:</strong><br>
        - Protocolo: #${newTicketId}<br>
        - Assunto: ${title}<br>
        - Setor: ${sector || 'Não informado'}<br>
        - Prioridade: ${priority}<br><br>
        Você pode acompanhar o andamento pelo nosso portal.`,
        Number(newTicketId)
      );
    }

      res.json({ id: newTicketId });
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      const errorMessage = error.message || "";
      if (errorMessage === "UNIQUE_EXTERNAL_ID" || errorMessage.includes("UNIQUE") || errorMessage.includes("external_id")) {
        return res.status(409).json({ error: "Este chamado já está registrado (OS já existe)." });
      }
      res.status(500).json({ error: "Erro interno ao cadastrar chamado: " + errorMessage });
    }
  });

  app.put("/api/tickets/:id/status", (req, res) => {
    const { status, provider_id } = req.body;
    let query = "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP";
    const params = [status];
    
    if (provider_id) {
      query += ", provider_id = ?";
      params.push(provider_id);
    }
    
    query += " WHERE id = ?";
    params.push(req.params.id);

    db.prepare(query).run(...params);

    // Notify the client and assigned provider about the status change
    const ticket = db.prepare(`
      SELECT t.client_id, t.provider_id, t.title, c.email as client_email, p.email as provider_email 
      FROM tickets t 
      LEFT JOIN users c ON t.client_id = c.id
      LEFT JOIN users p ON t.provider_id = p.id
      WHERE t.id = ?
    `).get(req.params.id) as any;

    if (ticket) {
      // Notificação Interna sempre
      const notificationTitle = status === 'Finalizado' ? "Chamado Finalizado" : 
                               status === 'Cancelado' ? "Chamado Cancelado" : "Status Atualizado";
      createNotification(ticket.client_id, notificationTitle, `O chamado #${req.params.id} (${ticket.title}) mudou para: ${status}`, status === 'Finalizado' ? 'success' : (status === 'Cancelado' ? 'warning' : 'info'));
      
      const recipients = [ticket.client_email];
      if (ticket.provider_email) recipients.push(ticket.provider_email);

      // Enviar e-mail APENAS se estiver finalizando ou cancelando
      if (status === 'Finalizado' || status === 'Cancelado') {
        sendEmail(
          recipients,
          status === 'Finalizado' ? "Chamado Finalizado" : "Chamado Cancelado",
          status === 'Finalizado' ? "Seu Chamado foi Finalizado" : "Seu Chamado foi Cancelado",
          `Olá!<br><br>O status do seu chamado <strong>${ticket.title}</strong> foi atualizado para: <strong>${status}</strong>.<br><br>
          Acesse o portal para conferir as atualizações.`,
          String(req.params.id)
        );
      }
    }

    res.json({ success: true });
  });

  app.put("/api/tickets/:id/materials", (req, res) => {
    const { materials } = req.body;
    db.prepare("UPDATE tickets SET materials = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(materials, req.params.id);
    res.json({ success: true });
  });

  app.put("/api/tickets/:id/assign", (req, res) => {
    const { provider_id } = req.body;
    db.prepare("UPDATE tickets SET provider_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(provider_id, req.params.id);
    res.json({ success: true });
  });

  app.put("/api/tickets/:id/nps", (req, res) => {
    const { nps_score } = req.body;
    db.prepare("UPDATE tickets SET nps_score = ? WHERE id = ?").run(nps_score, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/tickets/:id/comments", (req, res) => {
    const { user_id, message } = req.body;
    const stmt = db.prepare("INSERT INTO comments (ticket_id, user_id, message) VALUES (?, ?, ?)");
    const info = stmt.run(req.params.id, user_id, message);
    
    const ticket = db.prepare(`
      SELECT t.client_id, t.provider_id, t.title, c.email as client_email, p.email as provider_email 
      FROM tickets t 
      LEFT JOIN users c ON t.client_id = c.id
      LEFT JOIN users p ON t.provider_id = p.id
      WHERE t.id = ?
    `).get(req.params.id) as any;

    if (ticket) {
      const recipientId = user_id === ticket.client_id ? ticket.provider_id : ticket.client_id;
      const recipientEmail = user_id === ticket.client_id ? ticket.provider_email : ticket.client_email;

      if (recipientId) {
        createNotification(recipientId, "Nova mensagem", `Nova resposta no chamado #${req.params.id}: ${ticket.title}`, 'info');

        // Auto-update status to "Em Atendimento" if it's "Em Aberto"
        const currentTicket = db.prepare("SELECT status, client_id, provider_id FROM tickets WHERE id = ?").get(req.params.id) as any;
        if (currentTicket?.status === 'Em Aberto') {
          // If responder is not the client, assign as provider
          if (req.body.user_id !== currentTicket.client_id) {
            db.prepare("UPDATE tickets SET status = 'Em Atendimento', provider_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.body.user_id, req.params.id);
          } else {
            db.prepare("UPDATE tickets SET status = 'Em Atendimento', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
          }
          
          // Also notify the client internally
          createNotification(currentTicket.client_id, "Status Atualizado", `Protocolo #${req.params.id}: Em Atendimento`, 'info');
        }
      }

      // REMOVIDO: Envio de e-mail para comentários (apenas notificação interna)
    }

    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/notifications", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? AND is_read = 0 
      ORDER BY created_at DESC
    `).all(userId);
    res.json(notifications);
  });

  app.put("/api/notifications/:id/read", (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/notifications/read-all", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
    res.json({ success: true });
  });

  app.delete("/api/tickets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { userId, userRole } = req.query; // Simple auth-free permission check for local dev

      // 1. Fetch ticket to check ownership
      const ticket = db.prepare("SELECT client_id FROM tickets WHERE id = ?").get(id) as any;
      if (!ticket) {
        return res.status(404).json({ error: "Chamado não encontrado" });
      }

      // 2. Check permissions
      const isOwner = userId && Number(userId) === ticket.client_id;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Você não tem permissão para excluir este chamado" });
      }

      // 3. Cascade Delete (SQLite needs foreign keys enabled, but we'll do it manually to be safe)
      db.transaction(() => {
        db.prepare("DELETE FROM comments WHERE ticket_id = ?").run(id);
        db.prepare("DELETE FROM ticket_photos WHERE ticket_id = ?").run(id);
        db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
      })();

      res.json({ success: true });
    } catch (error) {
      console.error("Delete Ticket Error:", error);
      res.status(500).json({ error: "Erro ao excluir chamado" });
    }
  });

  app.get("/api/dashboard", (req, res) => {
    // 1. Opinião (NPS) - Distribution
    const opinionDist = db.prepare(`
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

    if (opinionDist.length === 0) {
      opinionDist.push({ name: 'Promotores', value: 0 }, { name: 'Neutros', value: 0 }, { name: 'Detratores', value: 0 });
    }

    // 2. Resolução de Problemas (Success Rate)
    const resolutionStats = db.prepare(`
      SELECT status as name, COUNT(*) as value FROM tickets GROUP BY status
    `).all();

    // 3. Criados x Finalizados por Período (Backlog)
    const backlogData = db.prepare(`
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

    // 6. Campos Personalizados (Distribution)
    const customFieldsDist = db.prepare(`
      SELECT location as name, COUNT(*) as value FROM tickets GROUP BY location
    `).all();

    // 7. Dia da Semana (Real data from DB)
    const rawTimeDist = db.prepare(`
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
    `).all() as any[];

    const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const timeDistribution = daysOrder.map(day => ({
      name: day,
      value: (rawTimeDist?.find((r: any) => r.name === day) as any)?.value || 0
    }));

    // 8. Tempos Médios/Totais - Zeroed
    const timeStats = {
      avgClosing: 0,
      totalClosing: 0,
      avgWorking: 0,
      totalWorking: 0,
      avgWaiting: 0,
      totalResponseWork: 0
    };

    // 9. Valor Total - Zeroed
    const valueStats = {
      total: 0,
      extra: 0
    };

    // 10. Reabertura
    const reopens = db.prepare("SELECT COUNT(*) as count FROM comments WHERE message LIKE '%reaberto%'").get() as any;

    // 11. Chamados Abertos
    const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('Em Aberto', 'Aguardando Peças')").get() as any;

    // 12. Progresso de SLA por Atendente
    const slaByProvider = db.prepare(`
      SELECT u.name, AVG(julianday(t.updated_at) - julianday(t.created_at)) * 24 as avg_hours
      FROM tickets t
      JOIN users u ON t.provider_id = u.id
      WHERE t.status = 'Finalizado'
      GROUP BY u.name
    `).all();

    // 13. Opinião (Real average from DB)
    const avgNps = db.prepare("SELECT AVG(nps_score) as avg FROM tickets WHERE nps_score IS NOT NULL").get() as any;
    const opinionTimeline = [
      { name: 'Média Atual', value: avgNps?.avg ? parseFloat(avgNps.avg.toFixed(1)) : 0 }
    ];

    res.json({ 
      opinionDist, 
      resolutionStats, 
      backlogData, 
      deadlineStats, 
      initiationStats,
      customFieldsDist,
      timeDistribution,
      timeStats,
      valueStats,
      reopens: reopens.count || 0,
      openTickets: openTickets.count,
      slaData: slaByProvider,
      opinionTimeline,
      byType: db.prepare("SELECT type as name, COUNT(*) as value FROM tickets GROUP BY type").all(),
      byCompany: []
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
