import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  try {
    const url=Deno.env.get("SUPABASE_URL")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth=req.headers.get("Authorization")||"";
    const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await caller.auth.getUser();
    if(!user) throw new Error("Usuário não autenticado.");

    const admin=createClient(url,service);
    const {data:perfil}=await admin.from("perfis").select("tipo_usuario,ativo").eq("id",user.id).maybeSingle();
    if(!perfil?.ativo || perfil.tipo_usuario!=="administradora") throw new Error("Apenas administradoras podem criar acessos.");

    const {profissional_id}=await req.json();
    const {data:p,error:pe}=await admin.from("profissionais").select("id,nome,email,telefone,perfil_id").eq("id",profissional_id).single();
    if(pe) throw pe;
    if(!p.email) throw new Error("Informe o e-mail do profissional.");

    let uid=p.perfil_id;
    if(!uid){
      const redirect=`${req.headers.get("origin") || ""}/index.html`;
      const {data:invite,error:ie}=await admin.auth.admin.inviteUserByEmail(p.email,{data:{nome:p.nome,tipo_usuario:"profissional"},redirectTo:redirect});
      if(ie) throw ie;
      uid=invite.user.id;
      const {error:perr}=await admin.from("perfis").upsert({id:uid,nome:p.nome,telefone:p.telefone,tipo_usuario:"profissional",ativo:true},{onConflict:"id"});
      if(perr) throw perr;
      const {error:up}=await admin.from("profissionais").update({perfil_id:uid,acesso_status:"convite_enviado"}).eq("id",p.id);
      if(up) throw up;
    } else {
      const {error:re}=await admin.auth.admin.generateLink({type:"recovery",email:p.email});
      if(re) throw re;
      await admin.from("profissionais").update({acesso_status:"convite_enviado"}).eq("id",p.id);
    }

    const phone=String(p.telefone||"").replace(/\D/g,"");
    const br=phone ? (phone.startsWith("55")?phone:"55"+phone) : "";
    const msg=encodeURIComponent(`Olá, ${p.nome}! Seu acesso à LiS Beauty foi criado. Enviamos para ${p.email} o link seguro para definir sua senha. Após criar a senha, acesse o sistema da LiS Beauty.`);
    return new Response(JSON.stringify({ok:true,whatsapp_url:br?`https://wa.me/${br}?text=${msg}`:null}),{headers:{...cors,"Content-Type":"application/json"}});
  } catch(e) {
    return new Response(JSON.stringify({error:e.message||String(e)}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  }
});