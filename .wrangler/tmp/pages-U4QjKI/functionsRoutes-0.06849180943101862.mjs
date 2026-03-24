import { onRequest as __api___route___ts_onRequest } from "C:\\Users\\Usuário\\OneDrive\\antigravity\\Projetos\\chamadosoperarum\\functions\\api\\[[route]].ts"
import { onRequest as __api___route___AlienWare_Arlei_ts_onRequest } from "C:\\Users\\Usuário\\OneDrive\\antigravity\\Projetos\\chamadosoperarum\\functions\\api\\[[route]]-AlienWare-Arlei.ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  {
      routePath: "/api/:route*-AlienWare-Arlei",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___AlienWare_Arlei_ts_onRequest],
    },
  ]