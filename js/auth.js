const LOGIN_PAGE = "index.html";
const ADMIN_PAGE = "dashboard.html";
const PROFESSIONAL_PAGE = "minha-area.html";
const SET_PASSWORD_PAGE = "definir-senha.html";
const ADMIN_PAGES = new Set(["dashboard.html","clientes.html","servicos.html","profissionais.html","agenda.html","financeiro.html","relatorios.html"]);
function paginaAtual(){return location.pathname.split("/").pop() || LOGIN_PAGE;}
async function tipoDeAcesso(userId){
 const {data,error}=await supabaseClient.from("perfis").select("tipo_usuario,ativo").eq("id",userId).maybeSingle();
 if(error)throw error;
 if(!data?.ativo)throw new Error("Seu perfil está inativo ou ainda não foi vinculado. Contate a administradora.");
 return data.tipo_usuario;
}
function destino(tipo){return tipo==="administradora"?ADMIN_PAGE:tipo==="profissional"?PROFESSIONAL_PAGE:LOGIN_PAGE;}
async function protegerPagina(){
 const pagina=paginaAtual();
 if(pagina===SET_PASSWORD_PAGE)return;
 const {data:{session},error}=await supabaseClient.auth.getSession();
 if(error)throw error;
 if(!session){if(pagina!==LOGIN_PAGE)location.replace(LOGIN_PAGE);return;}
 const tipo=await tipoDeAcesso(session.user.id);
 const alvo=destino(tipo);
 if(pagina===LOGIN_PAGE || (ADMIN_PAGES.has(pagina)&&tipo!=="administradora") || (pagina===PROFESSIONAL_PAGE&&tipo!=="profissional")) location.replace(alvo);
}
document.addEventListener("DOMContentLoaded",async()=>{
 const loginForm=document.getElementById("loginForm"), msg=document.getElementById("loginMessage");
 try{await protegerPagina()}catch(e){console.error(e);if(msg){msg.textContent=e.message;msg.className="form-message error";}}
 if(loginForm){loginForm.addEventListener("submit",async event=>{
  event.preventDefault();const btn=loginForm.querySelector('button[type="submit"]');btn.disabled=true;
  msg.textContent="Entrando...";msg.className="form-message";
  try{
   const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value;
   const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;
   const tipo=await tipoDeAcesso(data.user.id);location.replace(destino(tipo));
  }catch(e){console.error(e);msg.textContent=e.message||"Não foi possível entrar.";msg.className="form-message error";}finally{btn.disabled=false;}
 });}
 const logoutBtn=document.getElementById("logoutBtn");if(logoutBtn)logoutBtn.addEventListener("click",async()=>{await supabaseClient.auth.signOut();location.replace(LOGIN_PAGE)});
});
