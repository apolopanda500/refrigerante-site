// Convencao - dados
var CT=[
{id:"de",nm:"Destaques",ic:"fa-star"},
{id:"2l",nm:"Refrigerantes 2L",ic:"fa-bottle-water"},
{id:"60",nm:"Refrigerantes 600ml",ic:"fa-glass-water"},
{id:"35",nm:"Refrigerantes 350ml",ic:"fa-mug-hot"},
{id:"re",nm:"Refrescos e Chinotto",ic:"fa-lemon"},
{id:"mx",nm:"MSX Energetico",ic:"fa-bolt"},
{id:"ag",nm:"Agua",ic:"fa-tint"},
{id:"ch",nm:"Chopp Ravache",ic:"fa-beer-mug-empty"}];
var PD=[];
function addP(c,n,d,p,i){PD.push({ct:c,nm:n,ds:d,pr:p,im:i})}
// ===== DESTAQUES =====
addP("de","Chinotto 269ml Pct c12","Pack 12 latinhas","R$ 25,00","img/p01.jpg");
addP("de","Guarana Zero 269ml Pct c12","Sem acucar - Pack 12","R$ 33,40","img/p03.jpg");

// ===== REFRIGERANTES 2L - pacotes c6 =====
addP("2l","Guarana 2L Pct c6","Pack 6 garrafas","R$ 27,00","img/p06.jpg");
addP("2l","Guarana Zero 2L Pct c6","Zero - Pack 6","R$ 27,00","img/p07.jpg");
addP("2l","Laranja 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p08.jpg");
addP("2l","Uva 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p09.jpg");
addP("2l","Limao 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p10.jpg");
addP("2l","Abacaxi 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p11.jpg");
addP("2l","Vitts Limao 2L Pct c6","Pack 6 garrafas","R$ 28,00","img/p27.jpg");
addP("2l","Cola 2L Pct c6","Pack 6 garrafas","R$ 29,00","img/p05.jpg");
addP("2l","MSX 2L Pct c6","Pack 6 garrafas","R$ 40,00","img/p21.jpg");

// ===== REFRIGERANTES 600ml - pacotes c12 =====
addP("60","Guarana 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p12.jpg");
addP("60","Laranja 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p13.jpg");
addP("60","Uva 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p14.jpg");
addP("60","Abacaxi 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p15.jpg");

// ===== REFRIGERANTES 350ml - pacotes c6 =====
addP("35","Cola 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p16.jpg");
addP("35","Guarana 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p17.jpg");
addP("35","Laranja 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p18.jpg");
addP("35","Uva 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p19.jpg");
addP("35","Abacaxi 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p20.jpg");
addP("35","Vitts Limao 350ml Pct c6","Limao - Pack 6","R$ 19,00","img/p26.jpg");

// ===== REFRESCOS E CHINOTTO =====
addP("re","Frutaina 2L Pct c6","4 sabores - Pack 6","R$ 27,50","img/p04.jpg");

// ===== MSX ENERGETICO =====
addP("mx","MSX 269ml Pct c12","Pack 12 latinhas","R$ 25,00","img/p02.jpg");

// ===== AGUA =====
addP("ag","Agua 510ml Pct c12","Sem gas - Pack 12","R$ 14,70","img/p22.jpg");
addP("ag","Agua Gas 510ml Pct c12","Com gas - Pack 12","R$ 19,00","img/p23.jpg");
addP("ag","Agua 1500ml Pct c06","Sem gas - Pack 6","R$ 15,80","img/p24.jpg");
addP("ag","Agua Gas 1500ml Pct c06","Com gas - Pack 6","R$ 22,50","img/p25.jpg");

// ===== CHOPP RAVACHE 500ml =====
addP("ch","Chopp IPA 500ml","500ml","R$ 29,50","img/p28.jpg");
addP("ch","Chopp Gold 500ml","500ml","R$ 29,50","img/p30.jpg");
addP("ch","Chopp Pilsen 500ml","500ml","R$ 29,50","img/p31.jpg");
addP("ch","Chopp LEV 500ml","500ml","R$ 29,50","img/p34.jpg");
addP("ch","Chopp Black 500ml","500ml","R$ 34,50","img/p29.jpg");
addP("ch","Chopp Malzbier 500ml","500ml","R$ 33,30","img/p33.jpg");
addP("ch","Chopp Vinho 500ml","500ml","R$ 35,80","img/p32.jpg");

// ===== CHOPP RAVACHE - BARRIS 20L e 30L =====
addP("ch","Chopp LEV Barril 20L","Barril 20L","R$ 170,00","img/p36.jpg");
addP("ch","Chopp LEV Barril 30L","Barril 30L","R$ 260,00","img/p36.jpg");
addP("ch","Chopp Pilsen Barril 20L","Barril 20L","R$ 310,00","img/p36.jpg");
addP("ch","Chopp Pilsen Barril 30L","Barril 30L","R$ 425,00","img/p36.jpg");
addP("ch","Chopp Vinho Barril 20L","Barril 20L","R$ 320,00","img/p35.jpg");
addP("ch","Chopp Vinho Barril 30L","Barril 30L","R$ 440,00","img/p35.jpg");
addP("ch","Chopp Gold Barril 20L","Barril 20L","R$ 330,00","img/p36.jpg");
addP("ch","Chopp Gold Barril 30L","Barril 30L","R$ 455,00","img/p36.jpg");
addP("ch","Chopp APA Barril 20L","Barril 20L","R$ 330,00","img/p36.jpg");
addP("ch","Chopp APA Barril 30L","Barril 30L","R$ 455,00","img/p36.jpg");
addP("ch","Chopp IPA Barril 20L","Barril 20L","R$ 330,00","img/p36.jpg");
addP("ch","Chopp IPA Barril 30L","Barril 30L","R$ 455,00","img/p36.jpg");
function rT(){var h="";for(var i=0;i<CT.length;i++){var c=CT[i],n=0;
for(var j=0;j<PD.length;j++)if(PD[j].ct===c.id)n++;
h+='<button class="ti'+(i===0?' on':'')+'" data-g="'+c.id+'" onclick="goG(\''+c.id+'\')"><i class="fa '+c.ic+'"></i> '+c.nm+' <span class="cn">'+n+'</span></button>'}
var e=document.getElementById("trRow");if(e)e.innerHTML=h}
function rP(){var h="";for(var k=0;k<CT.length;k++){var c=CT[k],ps=[];
for(var j=0;j<PD.length;j++)if(PD[j].ct===c.id)ps.push({o:PD[j],x:j});
if(!ps.length)continue;
h+='<div class="gb op" id="g-'+c.id+'" data-gid="'+c.id+'">';
h+='<div class="gh" onclick="tgG(\''+c.id+'\')"><div class="gl"><i class="fa '+c.ic+' gi"></i><span class="gn">'+c.nm+'</span><span class="gc">'+ps.length+'</span></div><i class="fa fa-chevron-down gv"></i></div>';
h+='<div class="gbd"><div class="pg">';
for(var m=0;m<ps.length;m++){var p=ps[m].o,gid=c.id+"."+ps[m].x;
h+='<div class="pc" data-d="'+(p.nm+" "+p.ds).toLowerCase()+'" data-pid="'+gid+'">';
h+='<div class="pch">'+p.nm+'</div>';
h+='<div class="pib"><img class="pi" src="'+p.im+'" alt="p" loading="lazy" onerror="this.style.display=\'none\'"></div>';
h+='<div class="pdd"><span class="pds">'+p.ds+'</span><span class="pp">'+p.pr+'</span></div>';
 h+='<div class="qr"><div class="qc"><button type="button" class="qb" onclick="mQ(this,-1)">-</button><span class="qv">0</span><button type="button" class="qb" onclick="mQ(this,1)">+</button></div><button class="qa" onclick="aC(this)">Adicionar</button></div></div>'}
h+='</div></div></div>'}
var w=document.getElementById("pwMain");if(w)w.innerHTML=h}
function tgG(id){var e=document.getElementById("g-"+id);if(e)e.classList.toggle("op")}
function goG(id){var e=document.getElementById("g-"+id);if(!e)return;
var t=e.getBoundingClientRect().top+window.pageYOffset-170;
try{window.scrollTo({top:t,behavior:"smooth"})}catch(x){window.scrollTo(0,t)}
var a=document.querySelectorAll(".ti");for(var i=0;i<a.length;i++)a[i].classList.remove("on");
var b=document.querySelector('.ti[data-g="'+id+'"]');
if(b){b.classList.add("on");try{b.scrollIntoView({inline:"center",block:"nearest"})}catch(x){}}}
function fs(t){var s=(t||"").toLowerCase();
var cs=document.querySelectorAll(".pc");for(var i=0;i<cs.length;i++){var c=cs[i];
c.style.display=(!s||(c.getAttribute("data-d")||"").indexOf(s)>=0)?"":"none"}
var gs=document.querySelectorAll(".gb");for(var j=0;j<gs.length;j++){var g=gs[j],ok=false;
var ps=g.querySelectorAll(".pc");for(var k=0;k<ps.length;k++)if(ps[k].style.display!=="none")ok=true;
g.style.display=ok?"":"none";if(s&&ok)g.classList.add("op")}}
function mQ(bt,dl){try{var s=bt.parentNode.querySelector(".qv");s.textContent=Math.max(0,(parseInt(s.textContent)||0)+dl)}catch(e){}}
function uC(){try{var it=JSON.parse(localStorage.getItem("refrigeranteCart")||"[]");var t=0;
for(var i=0;i<it.length;i++)t+=(it[i].qty||0);
var a=document.getElementById("cBag"),b=document.getElementById("fBag");
if(a)a.textContent=t;if(b)b.textContent=t}catch(e){}}
function aC(bt){try{var cd=bt.parentNode.parentNode;var q=parseInt(cd.querySelector(".qv").textContent)||0;
if(q<=0){alert("Use os botoes + e - para escolher a quantidade.");return}
var pid=cd.getAttribute("data-pid").split(".");var pr=PD[parseInt(pid[1])];if(!pr)return;
var pv=0;var mm=String(pr.pr).match(/[\d.,]+/);if(mm)pv=parseFloat(mm[0].replace(/\./g,"").replace(",","."));
var ct=JSON.parse(localStorage.getItem("refrigeranteCart")||"[]");
ct.push({name:pr.nm,price:pr.pr,priceNum:pv,qty:q});localStorage.setItem("refrigeranteCart",JSON.stringify(ct));
 cd.querySelector(".qv").textContent="0";bt.classList.add("ok");bt.textContent="Adicionado!";
 setTimeout(function(){bt.classList.remove("ok");bt.textContent="Adicionar"},1500);uC()}catch(e){}}
function partilhar(){try{var u=location.href.split("#")[0];
if(navigator.share){navigator.share({title:"Convencao",text:"Confira!",url:u}).catch(function(){})}
else if(navigator.clipboard){navigator.clipboard.writeText(u);alert("Link copiado!")}}catch(e){}}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){try{rT()}catch(e){}try{rP()}catch(e){}try{uC()}catch(e){}var l=document.getElementById("ldBox");if(l)l.style.display="none"})}else{try{rT()}catch(e){}try{rP()}catch(e){}try{uC()}catch(e){}var l=document.getElementById("ldBox");if(l)l.style.display="none"}
setTimeout(function(){var l=document.getElementById("ldBox");if(l)l.style.display="none"},3000);
