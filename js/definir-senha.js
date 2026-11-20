const form=document.getElementById("senhaForm"),msg=document.getElementById("senhaMensagem");
function aviso(t,erro=false){msg.textContent=t;msg.className="form-message"+(erro?" error":"");}
async function aguardarSessao(){
 const {data:{session}}=await supabaseClient.auth.getSession();if(session)return session;
 return await new Promise(resolve=>{let done=false;const {data:{subscription}}=supabaseClient.auth.onAuthStateChange((_event,s)=>{if(s&&!done){done=true;subscription.unsubscribe();resolve(s)}});setTimeout(()=>{if(!done){done=true;subscription.unsubscribe();resolve(null)}},5000)});
}
(async()=>{
 const params=new URLSearchParams(location.search);
 if(params.get("error")||params.get("error_description")){aviso(params.get("error_description")||"Link inválido ou expirado.",true);form.querySelector("button").disabled=true;return;}
 if(params.get("code")){
  const {error}=await supabaseClient.auth.exchangeCodeForSession(params.get("code"));if(error){aviso("Não foi possível validar o link: "+error.message,true);return;}
 }
 const hash=new URLSearchParams(location.hash.slice(1));
 if(hash.get("access_token")&&hash.get("refresh_token")){
  const {error}=await supabaseClient.auth.setSession({access_token:hash.get("access_token"),refresh_token:hash.get("refresh_token")});if(error){aviso("Link inválido ou expirado.",true);return;}
  history.replaceState({},"",location.pathname);
 }
 const session=await aguardarSessao();if(!session)aviso("Abra esta página pelo link recebido no e-mail. O link pode ter expirado.",true);
})();
form.addEventListener("submit",async e=>{
 e.preventDefault();const a=document.getElementById("novaSenha").value,b=document.getElementById("confirmarSenha").value;
 if(a!==b){aviso("As senhas não coincidem.",true);return;}
 if(a.length<8){aviso("Use pelo menos 8 caracteres.",true);return;}
 const btn=form.querySelector("button");btn.disabled=true;aviso("Salvando senha...");
 try{
  const {data:{session}}=await supabaseClient.auth.getSession();if(!session)throw Error("Sessão de convite ausente. Abra o link recebido no e-mail novamente.");
  const {error}=await supabaseClient.auth.updateUser({password:a});if(error)throw error;
  aviso("Senha definida. Redirecionando...");
  const {data:perfil,error:pe}=await supabaseClient.from("perfis").select("tipo_usuario,ativo").eq("id",session.user.id).maybeSingle();
  if(pe||!perfil?.ativo)throw Error("Senha salva, mas o perfil ainda não está ativo. Contate a administradora.");
  location.replace(perfil.tipo_usuario==="profissional"?"minha-area.html":"dashboard.html");
 }catch(err){aviso(err.message||"Erro ao salvar senha.",true);btn.disabled=false;}
});
