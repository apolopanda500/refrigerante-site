// Convencao - dados de produtos (ASCII puro, sem acentos nos nomes de arquivo)
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
addP("de","Chinotto 269ml - Pct c/12","Pack 12 latinhas","R$ 25,00","img/p01.jpg");
addP("de","MSX 269ml - Pct c/12","Pack 12 latinhas","R$ 25,00","img/p02.jpg");
addP("de","Guarana Zero 269ml - Pct c/12","Sem acucar","R$ 35,00","img/p03.jpg");
addP("de","Frutaina 2L - Pacote c/6","4 sabores","R$ 27,00","img/p04.jpg");
addP("2l","Cola 2L","Garrafa 2 litros","R$ 12,00","img/p05.jpg");
addP("2l","Guarana 2L","Garrafa 2 litros","R$ 10,00","img/p06.jpg");
addP("2l","Guarana Zero 2L","Zero 2 litros","R$ 10,00","img/p07.jpg");
addP("2l","Laranja 2L","Garrafa 2 litros","R$ 10,00","img/p08.jpg");
addP("2l","Uva 2L","Garrafa 2 litros","R$ 10,00","img/p09.jpg");
addP("2l","Limao 2L","Garrafa 2 litros","R$ 10,00","img/p10.jpg");
addP("2l","Abacaxi 2L","Garrafa 2 litros","R$ 10,00","img/p11.jpg");
addP("2l","Guarana 2L - Pacote c/6","Pack 6 garrafas","R$ 55,00","img/p06.jpg");
addP("60","Guarana 600ml","Garrafa 600ml","R$ 6,00","img/p12.jpg");
addP("60","Laranja 600ml","Garrafa 600ml","R$ 6,00","img/p13.jpg");
addP("60","Uva 600ml","Garrafa 600ml","R$ 6,00","img/p14.jpg");
addP("60","Abacaxi 600ml","Garrafa 600ml","R$ 6,00","img/p15.jpg");
addP("35","Cola 350ml","Lata 350ml","R$ 5,00","img/p16.jpg");
addP("35","Guarana 350ml","Lata 350ml","R$ 4,50","img/p17.jpg");
addP("35","Laranja 350ml","Lata 350ml","R$ 4,50","img/p18.jpg");
addP("35","Uva 350ml","Lata 350ml","R$ 4,50","img/p19.jpg");
addP("35","Abacaxi 350ml","Lata 350ml","R$ 4,50","img/p20.jpg");
addP("re","Chinotto 269ml","Lata 269ml","R$ 5,00","img/p01.jpg");
addP("re","Chinotto 269ml - Pct c/12","Pack 12","R$ 25,00","img/p01.jpg");
addP("re","Frutaina 2L","4 sabores","R$ 7,00","img/p04.jpg");
addP("mx","MSX 269ml","Lata 269ml","R$ 5,00","img/p02.jpg");
addP("mx","MSX 269ml - Pct c/12","Pack 12","R$ 25,00","img/p02.jpg");
addP("mx","MSX 2L","Garrafa 2 litros","R$ 12,00","img/p21.jpg");
addP("ag","Agua 510ml - Pct c/12","Sem gas","R$ 12,00","img/p22.jpg");
addP("ag","Agua com Gas 510ml - Pct c/12","Com gas","R$ 12,00","img/p23.jpg");
addP("ag","Agua 1500ml - Pct c/06","Sem gas 1,5L","R$ 14,80","img/p24.jpg");
addP("ag","Agua com Gas 1500ml - Pct c/06","Com gas 1,5L","R$ 14,80","img/p25.jpg");
addP("ag","Vitts Limao 350ml","Refrigerante de limao","R$ 4,00","img/p26.jpg");
addP("ag","Vitts Limao 2L","Refrigerante de limao 2L","R$ 10,00","img/p27.jpg");
addP("ch","Chopp IPA 500ml","Garrafa 500ml","R$ 15,00","img/p28.jpg");
addP("ch","Chopp Black 500ml","Garrafa 500ml","R$ 15,00","img/p29.jpg");
addP("ch","Chopp Gold 500ml","Garrafa 500ml","R$ 15,00","img/p30.jpg");
addP("ch","Chopp Pilsen 500ml","Garrafa 500ml","R$ 15,00","img/p31.jpg");

function rT(){var h="";for(var i=0;i<CT.length;i++){var c=CT[i];var n=0;
for(var j=0;j<PD.length;j++)if(PD[j].ct===c.id)n++;
h+='<button class="ti'+(i===0?' on':'')+'" data-g="'+c.id+'" onclick="goG(\''+c.id+'\')"><i class="fa '+c.ic+'"></i> '+c.nm+' <span class="cn">'+n+'</span></button>'}
document.getElementById("trRow").innerHTML=h}
function rP(){var h="";for(var k=0;k<CT.length;k++){var c=CT[k];var ps=[];
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
h+='<div class="qr"><div class="qc"><button type="button" class="qb" onclick="mQ(this,-1)">-</button><span class="qv">0</span><button type="button" class="qb" onclick="mQ(this,1)">+</button></div><button class="qa" onclick="aC(this)"><i class="fa fa-cart-plus"></i> Add</button></div></div>'}
h+='</div></div></div>'}
document.getElementById("pwMain").innerHTML=h}
function tgG(id){var e=document.getElementById("g-"+id);if(e)e.classList.toggle("op")}
function goG(id){var e=document.getElementById("g-"+id);if(!e)return;
var t=e.getBoundingClientRect().top+window.pageYOffset-170;window.scrollTo({top:t,behavior:"smooth"});
var a=document.querySelectorAll(".ti");for(var i=0;i<a.length;i++)a[i].classList.remove("on");
var b=document.querySelector('.ti[data-g="'+id+'"]');
if(b){b.classList.add("on");b.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})}}
function fs(t){var s=(t||"").toLowerCase().trim();
var cs=document.querySelectorAll(".pc");for(var i=0;i<cs.length;i++){var c=cs[i];var d=c.getAttribute("data-d")||"";c.style.display=(!s||d.indexOf(s)>=0)?"":"none"}
var gs=document.querySelectorAll(".gb");for(var j=0;j<gs.length;j++){var g=gs[j];var ok=false;
var ps=g.querySelectorAll(".pc");for(var k=0;k<ps.length;k++)if(ps[k].style.display!=="none")ok=true;
g.style.display=ok?"":"none";if(s&&ok)g.classList.add("op")}}
function mQ(bt,dl){var s=bt.parentNode.querySelector(".qv");s.textContent=Math.max(0,(parseInt(s.textContent)||0)+dl)}
function uC(){try{var it=JSON.parse(localStorage.getItem("refrigeranteCart")||"[]");var t=0;
for(var i=0;i<it.length;i++)t+=(it[i].qty||0);
var a=document.getElementById("cBag"),b=document.getElementById("fBag");if(a)a.textContent=t;if(b)b.textContent=t}catch(e){}}
function aC(bt){var cd=bt.parentNode.parentNode;var q=parseInt(cd.querySelector(".qv").textContent)||0;
if(q<=0){alert("Use os botoes + e - para escolher a quantidade.");return}
var pid=cd.getAttribute("data-pid").split(".");var pr=null;
for(var i=0;i<PD.length;i++){if(i===parseInt(pid[1])){pr=PD[i];break}}
if(!pr)return;
var pv=0;var mm=String(pr.pr).match(/[\d.,]+/);if(mm)pv=parseFloat(mm[0].replace(/\./g,"").replace(",","."));
try{var ct=JSON.parse(localStorage.getItem("refrigeranteCart")||"[]");ct.push({name:pr.nm,price:pr.pr,priceNum:pv,qty:q});localStorage.setItem("refrigeranteCart",JSON.stringify(ct))}catch(e){}
cd.querySelector(".qv").textContent="0";bt.classList.add("ok");bt.innerHTML="OK!";
setTimeout(function(){bt.classList.remove("ok");bt.innerHTML="Add"},1500);uC()}
function partilhar(){var u=location.href.split("#")[0];
if(navigator.share){navigator.share({title:"Convencao",text:"Confira!",url:u}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(u);alert("Link copiado!")}}
document.addEventListener("DOMContentLoaded",function(){rT();rP();uC();
setTimeout(function(){var l=document.getElementById("ldBox");if(l)l.style.display="none"},700);
window.addEventListener("scroll",function(){var s=window.pageYOffset+200;
var gs=document.querySelectorAll(".gb");for(var i=0;i<gs.length;i++){var g=gs[i];
if(s>=g.offsetTop&&s<g.offsetTop+g.offsetHeight){var gid=g.getAttribute("data-gid");
var ts=document.querySelectorAll(".ti");for(var j=0;j<ts.length;j++)ts[j].classList.remove("on");
var tb=document.querySelector('.ti[data-g="'+gid+'"]');if(tb)tb.classList.add("on")}}})});

addP("ch","Chopp Vinho 500ml","Garrafa 500ml","R$ 15,00","img/p32.jpg");
addP("ch","Chopp Malzbier 500ml","Garrafa 500ml","R$ 15,00","img/p33.jpg");
addP("ch","Chopp LEV 500ml","Garrafa 500ml","R$ 15,00","img/p34.jpg");
addP("ch","Chopp Vinho PET 20L","Barril 20L","R$ 318,87","img/p35.jpg");
addP("ch","Chopp Vinho PET 30L","Barril 30L","R$ 438,11","img/p35.jpg");
addP("ch","Chopp PET 20L","Variados","R$ 300,00","img/p36.jpg");
addP("ch","Chopp PET 30L","Variados","R$ 400,00","img/p36.jpg");
