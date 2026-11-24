'use strict';
/* R5b1: presentación y navegación. Las reglas de negocio viven en logica.js. */
const $=s=>document.querySelector(s), dinero=logica.dinero;
const CLAVE='tienda.bolsa.v2', CLAVE_ANTERIOR='tienda.bolsa.v1', CLAVE_VISTA='tienda.vista.v1', CLAVE_ENTREGA='tienda.farmasi.entrega.v1';
const SB='Salud y belleza', SIN_FARMASI='Los pedidos de Salud y belleza no están disponibles en este momento.';
const movimiento=matchMedia('(prefers-reduced-motion: reduce)');
let datos={articulos:[],combos:{3:12,5:18}}, linea='Ropa', categoria='Todas', talla='Todas', bolsa=[], enRespaldo=false, validando=false, consultando=false, avisosBolsa='';
let opcionFarmasi='', zonaFarmasi='', catalogoCargado=false;
const inicioCarga=Date.now();
function nodo(tag,clase,texto){const n=document.createElement(tag);if(clase)n.className=clase;if(texto!==undefined)n.textContent=String(texto??'');return n;}
function boton(texto,clase){const b=nodo('button',clase,texto);b.type='button';return b;}
function parrafo(texto,clase){return nodo('p',clase,texto);}
function foto(url){try{const u=new URL(url);return u.protocol==='https:'&&['lh3.googleusercontent.com','drive.google.com'].includes(u.hostname)?u.href:'';}catch(e){return '';}}
function imagen(a){const img=nodo('img');const src=foto(a.foto);if(src)img.src=src;img.alt=a.descripcion||'Producto';img.width=720;img.height=900;img.loading='lazy';img.decoding='async';return img;}
const esSalud=a=>a.linea===SB;
const requiereFarmasi=a=>logica.esEncargo(a)||esSalud(a);
const unidades=()=>bolsa.reduce((s,a)=>s+(a.cantidad??1),0);
const numeroWhatsApp=()=>{const n=String(datos.whatsapp||CONFIG.WHATSAPP);return /^\d{10,15}$/.test(n)?n:'';};
function enlaceWhatsApp(texto){const n=numeroWhatsApp();return n?'https://wa.me/'+n+'?text='+encodeURIComponent(texto):'';}
function disponible(a){return logica.limiteBolsa(a)>0&&!(enRespaldo&&logica.esEncargo(a))&&!(requiereFarmasi(a)&&!datos.farmasi);}
try{
  const v2=localStorage.getItem(CLAVE), guardado=JSON.parse(v2===null?localStorage.getItem(CLAVE_ANTERIOR)||'[]':v2);
  if(Array.isArray(guardado))bolsa=guardado.filter(a=>a&&logica.esCodigo(a.codigo)&&Number.isFinite(a.precio)&&a.precio>=0).filter((a,i,arr)=>arr.findIndex(b=>b.codigo===a.codigo)===i).slice(0,30).map(a=>({codigo:a.codigo,precio:a.precio,cantidad:v2===null?1:a.cantidad??1,modalidad:a.modalidad}));
}catch(e){/* La bolsa sigue en memoria. */}
try{const e=JSON.parse(localStorage.getItem(CLAVE_ENTREGA)||'{}');if(['Mi casillero','Entrega Sheepi'].includes(e.opcion))opcionFarmasi=e.opcion;if(typeof e.zona==='string')zonaFarmasi=e.zona;}catch(e){}
function invalidarEnlace(){$('#continuar').hidden=true;$('#continuar').removeAttribute('href');}
function guardar(){try{localStorage.setItem(CLAVE,JSON.stringify(bolsa));localStorage.removeItem(CLAVE_ANTERIOR);}catch(e){}invalidarEnlace();}
function guardarEntrega(){try{localStorage.setItem(CLAVE_ENTREGA,JSON.stringify({opcion:opcionFarmasi,zona:zonaFarmasi}));}catch(e){}invalidarEnlace();}

function normalizar(d){
  if(!d||d.ok!==true||!Array.isArray(d.articulos)||!d.combos)throw Error('El catálogo no está disponible.');
  for(const k of [3,5])if(!Number.isFinite(Number(d.combos[k]))||Number(d.combos[k])<0)throw Error('Los combos no son válidos.');
  const campos=['codigo','categoria','descripcion','marca','talla','estado','observacion','precio','combo','foto','fecha_ingreso','linea','modalidad','existencia','tiempo_entrega','maximo'];
  const vistos=new Set(), articulos=[];
  for(const a of d.articulos){
    if(!a||!logica.esCodigo(a.codigo)||vistos.has(a.codigo)||!Number.isFinite(a.precio)||a.precio<0||Object.hasOwn(a,'existencia')&&(!Number.isInteger(a.existencia)||a.existencia<2)||logica.esEncargo(a)&&(!Number.isInteger(a.maximo)||a.maximo<1||a.maximo>30))continue;
    const x=Object.fromEntries(campos.filter(k=>Object.hasOwn(a,k)).map(k=>[k,a[k]]));
    x.linea=a.linea||logica.lineaDeCodigo(a.codigo);x.modalidad=logica.esEncargo(a)?'encargo':'propia';
    x.combo=x.combo===true&&x.linea==='Ropa'&&!logica.esEncargo(x);
    for(const k of ['grupo','variante'])if(typeof a[k]==='string'&&a[k].trim())x[k]=a[k].trim();
    if(typeof a.color==='string'&&/^#[0-9a-f]{6}$/i.test(a.color))x.color=a.color;
    if(Number.isFinite(a.precio_publico)&&a.precio_publico>a.precio)x.precio_publico=a.precio_publico;
    if(Number.isFinite(a.recargo_traida)&&a.recargo_traida>=0)x.recargo_traida=a.recargo_traida;
    vistos.add(x.codigo);articulos.push(x);
  }
  let farmasi;
  if(d.farmasi&&typeof d.farmasi==='object'&&Array.isArray(d.farmasi.zonas)){
    const f={}, claves=['DESCUENTO_SHEEPI','TRAIDA_FIJA','TRAIDA_PESADO','TRAIDA_GRATIS_DESDE','CARGO_GESTION'];
    const valida=claves.every(k=>d.farmasi[k]===undefined||Number.isFinite(d.farmasi[k])&&d.farmasi[k]>=0&&(k!=='DESCUENTO_SHEEPI'||d.farmasi[k]<100));
    const zonas=d.farmasi.zonas, nombres=new Set();
    if(valida&&zonas.length&&zonas.every(z=>z&&typeof z.nombre==='string'&&z.nombre.trim()&&!nombres.has(z.nombre)&&!!nombres.add(z.nombre)&&(z.monto===null||Number.isFinite(z.monto)&&z.monto>=0))){
      for(const k of claves)if(d.farmasi[k]!==undefined)f[k]=d.farmasi[k];
      f.zonas=zonas.map(z=>({nombre:z.nombre,monto:z.monto}));
      if(typeof d.farmasi.FARMASI_TIEMPO==='string')f.FARMASI_TIEMPO=d.farmasi.FARMASI_TIEMPO;
      farmasi=f;
    }
  }
  return {ok:true,marca:d.marca,actualizado:d.actualizado,retiro:d.retiro,whatsapp:d.whatsapp,combos:{3:Number(d.combos[3]),5:Number(d.combos[5])},articulos,farmasi};
}
async function consultar(){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),6000);
  try{
    let url;
    if(CONFIG.URL_API==='local')url=new URL('datos-respaldo.json',location.href);
    else{if(CONFIG.URL_API.includes('__'))throw Error('Falta configurar la API.');url=new URL(CONFIG.URL_API);url.searchParams.set('v','1');}
    const r=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw Error('No se pudo consultar el catálogo.');return normalizar(await r.json());
  }finally{clearTimeout(timer);}
}
async function respaldo(){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),6000);
  try{const r=await fetch('datos-respaldo.json',{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar el catálogo. Intenta de nuevo más tarde.');return normalizar(await r.json());}finally{clearTimeout(timer);}
}
async function cargarDatos(){
  let nuevos, respaldoActivo=false;
  try{nuevos=await consultar();respaldoActivo=CONFIG.URL_API==='local';}catch(e){nuevos=await respaldo();respaldoActivo=true;}
  datos=nuevos;enRespaldo=respaldoActivo;catalogoCargado=true;
  $('#aviso').textContent=enRespaldo?(CONFIG.URL_API==='local'?'Vista local de muestra. Confirma la disponibilidad al conectar la tienda.':'Mostramos el catálogo de respaldo. La disponibilidad se confirma antes de pedir.'):'';
  $('#aviso').className='';
  const r=logica.refrescarBolsa(bolsa,datos.articulos,{enRespaldo});bolsa=r.bolsa;guardar();avisar(r.avisos);
  ajustarLinea();marca();desdeUrl();pintarFiltros();pintarCuadricula();pintarBolsa();pintarRecientes();
}
function avisar(avisos){if(!avisos.length)return;avisosBolsa=avisos.join(' ');$('#aviso-bolsa').textContent=avisosBolsa;$('#aviso').textContent=[$('#aviso').textContent,avisosBolsa].filter(Boolean).join(' ');}
function marca(){
  const nombre=datos.marca||CONFIG.MARCA;$('#marca').setAttribute('aria-label',nombre+', inicio');document.title=nombre+' · Ropa con historia';
  $('#retiro').textContent=datos.retiro||'Retiro coordinado por WhatsApp';
  $('#promocion').textContent='Promoción vigente · combo de 3 prendas distintas por '+dinero(datos.combos[3])+' o 5 por '+dinero(datos.combos[5]);
  const redes=$('#redes');redes.replaceChildren();
  for(const [nombre,url] of [['Instagram',CONFIG.INSTAGRAM],['Facebook',CONFIG.FACEBOOK]]){
    try{const u=new URL(url);if(u.protocol!=='https:'||!['instagram.com','www.instagram.com','facebook.com','www.facebook.com'].includes(u.hostname))continue;const a=nodo('a','',nombre);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';redes.append(a);}catch(e){}
  }
  const contacto=enlaceWhatsApp('Hola, quisiera consultar por los productos de Sheepi.');if(contacto){const a=nodo('a','','WhatsApp');a.href=contacto;a.target='_blank';a.rel='noopener noreferrer';redes.append(a);}
  const otro=enlaceWhatsApp('Hola, busco otro producto Farmasi. ¿Me ayudas a cotizarlo?');
  if(otro)$('#consultar-farmasi').href=otro;else $('#consultar-farmasi').removeAttribute('href');
}

/* Categorías, tallas y vista. El grupo Farmasi es distinto de la categoría de navegación. */
const articulosLinea=()=>datos.articulos.filter(a=>a.linea===linea);
const grupoCategoria=a=>a.linea==='Ropa'?(CONFIG.CATEGORIAS[a.categoria]||'Otros'):a.categoria||'Otros';
const enGrupo=(a,g)=>g==='Todas'||(g==='Combo'?a.combo===true:grupoCategoria(a)===g);
const slug=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ORDEN_TALLAS=['XXS','XS','S','M','L','XL','XXL','3XL'];
const ordenTalla=t=>{const i=ORDEN_TALLAS.indexOf(t);return i>=0?i:/^\d+$/.test(t)?100+Number(t):t==='ÚNICA'?500:600;};
function ajustarLinea(){const lineas=[...new Set(datos.articulos.map(a=>a.linea))];if(!lineas.includes(linea))linea=lineas[0]||'Ropa';}
function listaGrupos(){
  const arts=articulosLinea(), presentes=new Set(arts.map(grupoCategoria)), lista=[['Todas','Ver todo',arts.length]];
  for(const g of linea==='Ropa'?CONFIG.GRUPOS:[...presentes])if(presentes.has(g))lista.push([g,g,arts.filter(a=>grupoCategoria(a)===g).length]);
  const combos=linea==='Ropa'?arts.filter(a=>a.combo).length:0;if(combos)lista.push(['Combo','Combo',combos]);return lista;
}
function desdeUrl(){let h='';try{h=decodeURIComponent(location.hash.slice(1));}catch(e){}const g=listaGrupos().find(([v])=>slug(v)===h);categoria=g?g[0]:'Todas';}
function elegirGrupo(valor){categoria=valor;talla='Todas';const url=valor==='Todas'?location.pathname+location.search:'#'+slug(valor);history.pushState(null,'',url);pintarFiltros();pintarCuadricula();}
function cambiarLinea(valor){linea=valor;categoria='Todas';talla='Todas';history.replaceState(null,'',location.pathname+location.search);pintarFiltros();pintarCuadricula();}
function pintarFiltros(){
  ajustarLinea();const lineas=[...new Set(datos.articulos.map(a=>a.linea))], nav=$('#lineas');nav.hidden=lineas.length<=1;nav.replaceChildren();
  for(const l of lineas){const b=boton(l);b.dataset.linea=l;b.setAttribute('aria-pressed',String(l===linea));nav.append(b);}
  const grupos=listaGrupos();if(!grupos.some(([g])=>g===categoria))categoria='Todas';
  for(const id of ['#categorias','#menu-grupos']){
    const lista=$(id);lista.replaceChildren();
    grupos.forEach(([valor,texto,n],i)=>{const li=nodo('li'),b=boton('');b.dataset.grupo=valor;b.setAttribute('aria-current',String(valor===categoria));b.append(nodo('span','num','['+String(i+1).padStart(2,'0')+']'),nodo('span','',texto),nodo('span','conteo','('+n+')'));li.append(b);lista.append(li);});
  }
  const cont=$('#tallas');cont.replaceChildren();cont.hidden=linea===SB||!articulosLinea().some(a=>String(a.talla??'').trim());
  if(cont.hidden){talla='Todas';return;}
  const tallas=['Todas',...[...new Set(articulosLinea().filter(a=>enGrupo(a,categoria)).map(a=>logica.tallaCorta(a.talla)))].sort((a,b)=>ordenTalla(a)-ordenTalla(b)||a.localeCompare(b))];
  if(!tallas.includes(talla))talla='Todas';cont.append(nodo('span','rotulo','Talla'));
  for(const t of tallas){const b=boton(t);b.dataset.talla=t;b.setAttribute('aria-pressed',String(t===talla));cont.append(b);}
}
const opcionesVista=()=>matchMedia('(min-width:1024px)').matches?[2,3,4]:matchMedia('(min-width:640px)').matches?[2,3]:[1,2];
const vistaPorDefecto=()=>matchMedia('(min-width:1024px)').matches?4:matchMedia('(min-width:640px)').matches?3:2;
function leerVista(){try{const v=Number(JSON.parse(localStorage.getItem(CLAVE_VISTA)||'{}')[opcionesVista().join('')]);return opcionesVista().includes(v)?v:vistaPorDefecto();}catch(e){return vistaPorDefecto();}}
function guardarVista(v){try{const todo=JSON.parse(localStorage.getItem(CLAVE_VISTA)||'{}');todo[opcionesVista().join('')]=v;localStorage.setItem(CLAVE_VISTA,JSON.stringify(todo));}catch(e){}}
function pintarVista(){const v=leerVista(),cont=$('#vista');$('#catalogo').style.setProperty('--cols',v);cont.replaceChildren(nodo('span','rotulo','Vista'));for(const n of opcionesVista()){const b=boton(n);b.dataset.vista=n;b.setAttribute('aria-pressed',String(n===v));b.setAttribute('aria-label',n+' por fila');cont.append(b);}}

const claveGrupo=a=>esSalud(a)&&a.grupo?'grupo:'+a.grupo:'articulo:'+a.codigo;
function variantesDe(a){return esSalud(a)&&a.grupo?datos.articulos.filter(x=>esSalud(x)&&x.grupo===a.grupo):[a];}
/* El API usa identificadores G-… como grupo: esos identificadores no son nombres públicos. */
function nombreProducto(a){return esSalud(a)&&a.grupo&&!/^G-[\w-]+$/i.test(a.grupo)?a.grupo:a.descripcion;}
/* Nombre de vitrina (2026-11-24): la descripción completa solo va en la ficha. Primera frase, hasta 4 palabras,
   sin cortar un complemento "de …" a la mitad ni terminar en palabra vacía. Salud y belleza conserva su nombre. */
const VACIAS_NOMBRE=new Set(['de','del','con','y','a','en','la','el','las','los','tipo','modelo','sin','e','o']);
function nombreCorto(texto,max=4){
  const todas=String(texto||'').trim().split(/[,:;(]/)[0].split(/\s+(?:con|modelo|tipo)\s+/i)[0].trim().split(/\s+/);let p=todas.slice(0,max);
  if(todas.length>max&&p.length>=4&&p[max-2].toLowerCase()==='de')p=p.slice(0,max-2);
  while(p.length>1&&VACIAS_NOMBRE.has(p[p.length-1].toLowerCase()))p.pop();
  return p.join(' ')||String(texto||'');
}
function nombreVitrina(a){return esSalud(a)?nombreProducto(a):nombreCorto(a.descripcion);}
const seleccionadas=new Map();
/* Geometría v3 traducida de posts-v3.py. Solo se calculan las combinaciones
   usadas; las tarjetas y la ficha clonan el SVG almacenado, sin red. */
const MARCOS_V3=[['ondas','#FDB7B8'],['lazos','#6B2138'],['puntos','#B8D8FF'],['festones','#6B2138'],['redondo','#B8D8FF'],['lazos','#D1C362'],['ondas','#6B2138'],['festones','#FDB7B8'],['puntos','#D1C362']];
const cacheMarcos=new Map();
function estiloMarco(codigo){let n=0;for(const c of String(codigo))n=(n*31+c.charCodeAt(0))>>>0;return MARCOS_V3[n%MARCOS_V3.length];}
function marcoSVG(tipo,color){
  const clave=tipo+color;if(cacheMarcos.has(clave))return cacheMarcos.get(clave).cloneNode(true);
  const lados=[[130,200,950,200],[950,200,950,1060],[950,1060,130,1060],[130,1060,130,200]],f=n=>n.toFixed(1);
  let d='',circulos='';
  if(tipo==='ondas'){
    const pts=[];for(const [xa,ya,xb,yb] of lados){const L=Math.hypot(xb-xa,yb-ya),n=Math.floor(L/4),k=Math.round(L/46);for(let i=0;i<=n;i++){const t=i/n,o=11*Math.sin(2*Math.PI*k*t);pts.push(f(xa+(xb-xa)*t-(yb-ya)/L*o)+','+f(ya+(yb-ya)*t+(xb-xa)/L*o));}}d='M'+pts.join(' L')+' Z';
  }else if(tipo==='festones'){
    d='M130,200';for(const [xa,ya,xb,yb] of lados){const L=Math.hypot(xb-xa,yb-ya),k=Math.round(L/48);for(let i=1;i<=k;i++)d+=' A'+f(L/k/2)+','+f(L/k/2)+' 0 0 1 '+f(xa+(xb-xa)*i/k)+','+f(ya+(yb-ya)*i/k);}d+=' Z';
  }else if(tipo==='lazos'){
    d='M162,200 L918,200 M950,232 L950,1028 M918,1060 L162,1060 M130,1028 L130,232';for(const [cx,cy] of [[130,200],[950,200],[950,1060],[130,1060]])d+=' M'+(cx-16)+','+cy+' a16,16 0 1 0 32,0 a16,16 0 1 0 -32,0';
  }else if(tipo==='puntos'){
    for(const [xa,ya,xb,yb] of lados){const n=Math.floor(Math.hypot(xb-xa,yb-ya)/26);for(let i=0;i<n;i++)circulos+='<circle cx="'+f(xa+(xb-xa)*i/n)+'" cy="'+f(ya+(yb-ya)*i/n)+'" r="'+(i%3?5:7)+'"/>';}
  }else{
    const pts=[];for(let i=0;i<=120;i++){const a=2*Math.PI*i/120,r=410*(1+.035*Math.sin(5*a)+.02*Math.cos(3*a));pts.push(f(540+r*Math.cos(a))+','+f(650+r*1.02*Math.sin(a)));}d='M'+pts.join(' L')+' Z M540,231.8 c-40,-60 -110,-40 -90,0 c15,30 70,10 90,0 c40,-60 110,-40 90,0 c-15,30 -70,10 -90,0 M540,231.8 l-45,95 M540,231.8 l40,90';
  }
  const plantilla=document.createElement('template');plantilla.innerHTML='<svg class="marco-svg" xmlns="http://www.w3.org/2000/svg" viewBox="60 100 960 1040" preserveAspectRatio="none" aria-hidden="true" focusable="false">'+(circulos?'<g fill="'+color+'">'+circulos+'</g>':'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>')+'</svg>';
  const svg=plantilla.content.firstElementChild;cacheMarcos.set(clave,svg);return svg.cloneNode(true);
}
function enmarcar(img,codigo,combo=false){
  const cont=nodo('div','foto-v3'),[tipo,color]=estiloMarco(codigo);
  cont.append(img,marcoSVG(tipo,color));if(combo){const sello=nodo('span','sello-combo','combo');sello.style.setProperty('--sello',color==='#6B2138'?'#FDB7B8':color);cont.append(sello);}return cont;
}
function elegida(variantes){return variantes.find(a=>a.codigo===seleccionadas.get(claveGrupo(variantes[0])))||variantes[0];}
function precios(a){
  const p=nodo('p','precio');
  if(esSalud(a)&&Number.isFinite(a.precio_publico)&&a.precio_publico>a.precio){
    const pct=datos.farmasi?.DESCUENTO_SHEEPI??Math.round((1-a.precio/a.precio_publico)*100);
    const antes=nodo('del','precio-publico',dinero(a.precio_publico));antes.setAttribute('aria-label','Precio público '+dinero(a.precio_publico));
    p.append(antes,nodo('span','descuento','-'+pct+' %'),nodo('strong','',dinero(a.precio)));
  }else p.append(nodo('strong','',dinero(a.precio)));
  return p;
}
function paleta(variantes,actual,elegir){
  const cont=nodo('div','paleta');cont.setAttribute('role','group');cont.setAttribute('aria-label','Elige una variante');
  for(const a of variantes){const nombre=a.variante||a.descripcion,b=boton(a.color?'':nombre,a.color?'tono':'tono-texto');b.setAttribute('aria-label',nombre);b.title=nombre;b.setAttribute('aria-pressed',String(a.codigo===actual.codigo));if(a.color)b.style.setProperty('--tono',a.color);b.onclick=()=>elegir(a);cont.append(b);}
  return cont;
}
function configurarAgregar(b,a){
  const dentro=bolsa.some(x=>x.codigo===a.codigo);b.dataset.agregar=a.codigo;b.dataset.enBolsa=String(dentro);b.disabled=!disponible(a)||validando;
  b.textContent=esSalud(a)?'Pídelo con Sheepi':dentro?'En tu bolsa':'Agregar a la bolsa';
  if(!disponible(a))b.textContent=requiereFarmasi(a)&&!datos.farmasi?'Pedidos no disponibles':'Disponible solo en línea';
  b.setAttribute('aria-label',b.textContent+': '+nombreVitrina(a)+(a.variante?' · '+a.variante:''));
}
function tarjeta(variantes,reciente=false){
  const art=nodo('article',reciente?'tarjeta prod':'tarjeta'), abrir=boton('','foto-boton'), pie=nodo('div','pie-tarjeta'), titulo=nodo('h3'), precioCont=nodo('div'), meta=parrafo('','talla'), selector=nodo('div'), variante=parrafo('','variante-elegida'), agregarBoton=boton('','agregar'), info=parrafo('','aviso-encargo');
  art.dataset.grupoProducto=claveGrupo(variantes[0]);abrir.append(enmarcar(imagen(elegida(variantes)),variantes[0].codigo,variantes[0].combo));pie.append(titulo,meta,precioCont,selector,variante,info,agregarBoton);art.append(abrir,pie);
  function actualizar(a){
    seleccionadas.set(claveGrupo(a),a.codigo);const img=abrir.querySelector('img'),src=foto(a.foto);if(src)img.src=src;else img.removeAttribute('src');img.alt=a.descripcion||'Producto';
    abrir.dataset.detalle=a.codigo;abrir.setAttribute('aria-label','Ver '+nombreVitrina(a)+(a.variante?' · '+a.variante:''));
    titulo.textContent=nombreVitrina(a);precioCont.replaceChildren(precios(a));meta.textContent=[a.marca,a.talla?'Talla '+logica.tallaCorta(a.talla):''].filter(Boolean).join(' · ');meta.hidden=!meta.textContent;
    variante.textContent=a.variante||'';variante.hidden=!a.variante;
    info.textContent=esSalud(a)?'Por pedido':logica.esEncargo(a)?'Por encargo · '+(a.tiempo_entrega||'fecha por confirmar'):'';info.hidden=!info.textContent;
    configurarAgregar(agregarBoton,a);
    if(esSalud(a)&&variantes.length>1)selector.replaceChildren(paleta(variantes,a,elegir));else selector.replaceChildren();
  }
  function elegir(a){actualizar(a);selector.querySelector('[aria-pressed="true"]')?.focus();}
  actualizar(elegida(variantes));return art;
}
function pintarCuadricula(){
  const arts=articulosLinea().filter(a=>enGrupo(a,categoria)&&(talla==='Todas'||logica.tallaCorta(a.talla)===talla)), grupos=new Map();
  for(const a of arts){const k=claveGrupo(a);if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(a);}
  const cont=$('#catalogo');cont.replaceChildren();const frag=document.createDocumentFragment();for(const variantes of grupos.values())frag.append(tarjeta(variantes));
  if(!grupos.size)frag.append(parrafo('No hay productos con estos filtros. Prueba otra categoría o talla.','vacio'));cont.append(frag);
  $('#cantidad').textContent=grupos.size+(grupos.size===1?' producto':' productos');$('#otro-farmasi').hidden=linea!==SB;
  $('#aviso').textContent=$('#aviso').textContent.replace(SIN_FARMASI,'').trim();
  if(linea===SB&&!datos.farmasi)$('#aviso').textContent=[$('#aviso').textContent,SIN_FARMASI].filter(Boolean).join(' ');
  pintarVista();
}
function actualizarBotones(){for(const b of document.querySelectorAll('[data-agregar]')){const a=datos.articulos.find(x=>x.codigo===b.dataset.agregar);if(a)configurarAgregar(b,a);}}
function abrirDetalle(codigo){
  const inicial=datos.articulos.find(a=>a.codigo===codigo);if(!inicial)return;
  const variantes=variantesDe(inicial), cont=$('#detalle-contenido'), img=imagen(inicial), ficha=nodo('div','ficha'), titulo=nodo('h2'), selector=nodo('div'), contenido=nodo('div');titulo.id='detalle-titulo';
  cont.replaceChildren(enmarcar(img,variantes[0].codigo,inicial.combo),ficha);ficha.append(titulo,selector,contenido);
  function actualizar(a){
    seleccionadas.set(claveGrupo(a),a.codigo);const src=foto(a.foto);if(src)img.src=src;else img.removeAttribute('src');img.alt=a.descripcion||'Producto';titulo.textContent=nombreVitrina(a);contenido.replaceChildren();if(!esSalud(a)&&a.descripcion&&a.descripcion!==titulo.textContent)contenido.append(parrafo(a.descripcion,'descripcion-producto'));
    if(esSalud(a)&&variantes.length>1)selector.replaceChildren(paleta(variantes,a,x=>{actualizar(x);selector.querySelector('[aria-pressed="true"]')?.focus();}));else selector.replaceChildren();
    if(a.variante)contenido.append(parrafo(a.variante,'variante-elegida'));
    if(a.talla)contenido.append(parrafo('Talla: '+a.talla));if(a.estado)contenido.append(parrafo('Estado: '+a.estado));if(a.combo)contenido.append(parrafo('Participa en combo'));
    if(logica.esObservacionPublica(a.observacion))contenido.append(parrafo(a.observacion));contenido.append(precios(a));
    if(esSalud(a)){contenido.append(parrafo('Por pedido: llega a tu casillero o a través del nuestro','aviso-encargo'),parrafo(a.tiempo_entrega||datos.farmasi?.FARMASI_TIEMPO||'Tiempo de entrega por confirmar.'),parrafo('Venta final: por higiene, no se aceptan devoluciones.','venta-final'));}
    else if(logica.esEncargo(a))contenido.append(parrafo('Por encargo · '+(a.tiempo_entrega||'fecha por confirmar')));
    const b=boton('','principal');configurarAgregar(b,a);contenido.append(b);if(requiereFarmasi(a)&&!datos.farmasi)contenido.append(parrafo(SIN_FARMASI,'nota'));
    if(a.marca)contenido.append(parrafo('Marca: '+a.marca,'marca-producto'));contenido.append(parrafo('Código: '+a.codigo,'codigo-producto'));
  }
  actualizar(inicial);if(!$('#detalle').open)$('#detalle').showModal();
}
function destello(){const c=$('.corchete');c.classList.remove('destello');void c.offsetWidth;c.classList.add('destello');}
function agregar(codigo){
  if(validando)return;const a=datos.articulos.find(x=>x.codigo===codigo);if(!a||!disponible(a))return;
  if(!bolsa.some(x=>x.codigo===codigo)){
    if(unidades()>=30){$('#aviso').textContent='Puedes pedir hasta 30 unidades por bolsa.';return;}
    const r=logica.refrescarBolsa([...bolsa,{...a,cantidad:1}],datos.articulos,{enRespaldo});bolsa=r.bolsa;avisar(r.avisos);guardar();destello();
  }
  pintarBolsa();actualizarBotones();if($('#detalle').open)$('#detalle').close();
}

/* La dirección vive únicamente en el textarea. Nunca se serializa ni se registra. */
function estadoEntrega(){
  if(!bolsa.some(requiereFarmasi))return {valido:true,cargos:null,aviso:''};
  if(!datos.farmasi)return {valido:false,cargos:null,aviso:SIN_FARMASI};
  if(!opcionFarmasi)return {valido:false,cargos:null,aviso:'Elige cómo prefieres recibir tu pedido.'};
  try{
    const cargos=logica.cargosFarmasi({items:bolsa,opcion:opcionFarmasi,zona:zonaFarmasi,config:datos.farmasi});
    if(!cargos.disponible)return {valido:false,cargos,aviso:cargos.aviso};
    if(opcionFarmasi==='Mi casillero'&&!$('#direccion-casillero').value.trim())return {valido:false,cargos,aviso:'Escribe la dirección de tu casillero en EE. UU.'};
    return {valido:true,cargos,aviso:cargos.aviso};
  }catch(e){return {valido:false,cargos:null,aviso:'No se pudo calcular la entrega. Escríbenos para coordinar.'};}
}
function pintarEntrega(){
  const hay=bolsa.some(requiereFarmasi);$('#entrega-farmasi').hidden=!hay;$('#entrega-ropa').hidden=!bolsa.some(a=>!requiereFarmasi(a));
  for(const r of document.querySelectorAll('[name="opcion-farmasi"]')){r.checked=r.value===opcionFarmasi;r.disabled=validando||!datos.farmasi;}
  $('#campos-casillero').hidden=!hay||opcionFarmasi!=='Mi casillero';$('#campos-zona').hidden=!hay||opcionFarmasi!=='Entrega Sheepi';
  const select=$('#zona-farmasi'), zonas=datos.farmasi?.zonas||[], firma=JSON.stringify(zonas);
  if(select.dataset.zonas!==firma){select.replaceChildren();const vacia=nodo('option','','Elige tu zona');vacia.value='';select.append(vacia);for(const z of zonas){const o=nodo('option','',z.nombre+(z.monto===null?' · No disponible por ahora':' · '+dinero(z.monto)));o.value=z.nombre;select.append(o);}select.dataset.zonas=firma;}
  if(!zonas.some(z=>z.nombre===zonaFarmasi))zonaFarmasi='';select.value=zonaFarmasi;select.disabled=validando||!datos.farmasi;
  $('#direccion-casillero').disabled=validando;$('#entrega').disabled=validando;
  const estado=estadoEntrega();$('#aviso-entrega').textContent=estado.aviso;$('#aviso-entrega').className=estado.valido?'nota':'error';
  $('#venta-final-bolsa').hidden=!bolsa.some(esSalud);return estado;
}
function pintarTotales(estado){
  const t=logica.totalBolsa(bolsa,datos.combos), c=estado.cargos;
  $('#subtotal').textContent=dinero(t.subtotal);$('#ahorro').textContent=dinero(t.descuento);
  for(const [fila,valor,importe] of [['#fila-traida','#traida',c?.traida],['#fila-entrega-farmasi','#costo-entrega-farmasi',c?.entrega],['#fila-gestion','#gestion',c?.gestion]]){$(fila).hidden=!c||(fila==='#fila-gestion'&&!(importe>0));$(valor).textContent=dinero(importe||0);}
  /* cargos.total contiene los productos Farmasi: se suman solo los tres cargos. */
  $('#total').textContent=dinero(t.total+(c?c.traida+c.entrega+c.gestion:0));
  const hay=bolsa.some(requiereFarmasi), umbral=datos.farmasi?.TRAIDA_GRATIS_DESDE??75;
  $('#traida-gratis').hidden=!hay||!datos.farmasi||opcionFarmasi!=='Entrega Sheepi';$('#traida-gratis').textContent='Traída gratis desde '+dinero(umbral)+' en productos Farmasi';
  $('#nota-total').hidden=!hay;$('#nota-total').textContent=opcionFarmasi==='Mi casillero'?'Total sin el envío de Farmasi ni el flete a Panamá, que se confirman al cotizar.':estado.valido?'El envío de ropa y otros productos se cotiza aparte según la zona.':'Total de referencia. Confirma una opción de entrega disponible para pedir.';
  if(hay&&!bolsa.some(a=>!requiereFarmasi(a))&&estado.valido&&opcionFarmasi==='Entrega Sheepi')$('#nota-total').textContent='Incluye los cargos Farmasi indicados.';
  $('#pedir').disabled=!bolsa.length||validando||!estado.valido;
}
function pintarBolsa(){
  $('#contador').textContent=unidades();$('#abrir-bolsa').setAttribute('aria-label','Abrir bolsa, '+unidades()+' unidades');const lista=$('#lista-bolsa');lista.replaceChildren();
  if(!bolsa.length)lista.append(parrafo('Tu bolsa está vacía.'));
  for(const a of bolsa){
    const fila=nodo('div','linea-bolsa'), texto=nodo('div'), img=imagen(a);img.width=72;img.height=90;
    texto.append(parrafo(nombreVitrina(a)+(a.variante?' · '+a.variante:'')),parrafo(a.codigo+(a.talla?' · '+a.talla:''),'secundario'),parrafo(dinero(a.precio)));
    const quitar=boton('Quitar');quitar.dataset.quitar=a.codigo;quitar.disabled=validando;quitar.setAttribute('aria-label','Quitar '+a.descripcion+' de la bolsa');texto.append(quitar);
    const limite=logica.limiteBolsa(a);
    if(limite>1){const c=nodo('div','cantidad-bolsa');for(const delta of [-1,1]){const b=boton(delta<0?'−':'+');b.dataset.cantidad=delta;b.dataset.codigo=a.codigo;b.setAttribute('aria-label',(delta<0?'Reducir':'Aumentar')+' cantidad de '+a.descripcion);b.disabled=validando||(delta<0?a.cantidad<=1:a.cantidad>=limite||unidades()>=30);if(delta>0)c.append(nodo('span','',a.cantidad));c.append(b);}texto.append(c);}
    fila.append(img,texto);lista.append(fila);
  }
  pintarTotales(pintarEntrega());
}
async function validarBolsa(){
  if(!bolsa.length)throw Error('Agrega productos a tu bolsa.');
  const anterior=bolsa.map(a=>({...a})), combos=JSON.stringify(datos.combos), farmasi=JSON.stringify(datos.farmasi);
  await cargarDatos();
  const cambio=anterior.length!==bolsa.length||anterior.some(a=>{const b=bolsa.find(x=>x.codigo===a.codigo);return !b||a.cantidad!==b.cantidad||a.precio!==b.precio||a.combo!==b.combo;})||combos!==JSON.stringify(datos.combos)||farmasi!==JSON.stringify(datos.farmasi);
  if(cambio)throw Error((avisosBolsa||'Se actualizaron los precios, combos o condiciones de entrega.')+' Revisa tu bolsa y vuelve a pedir.');
  if(!bolsa.length)throw Error('Tu bolsa está vacía.');const estado=estadoEntrega();if(!estado.valido)throw Error(estado.aviso);return bolsa;
}
async function pedir(){
  if(validando||consultando)return;validando=true;invalidarEnlace();pintarBolsa();actualizarBotones();$('#aviso-bolsa').textContent='Confirmando disponibilidad…';
  try{
    const items=await validarBolsa(), numero=numeroWhatsApp();if(!numero)throw Error('El WhatsApp de ventas está pendiente de configurar.');
    const entrega=items.some(a=>!requiereFarmasi(a))?$('#entrega').value:opcionFarmasi==='Entrega Sheepi'&&zonaFarmasi==='Retiro en casa'?'Retiro':'Delivery';
    const mensaje=logica.mensajeWhatsApp(items,entrega,datos.marca||CONFIG.MARCA,datos.combos,{opcion:opcionFarmasi,direccion:$('#direccion-casillero').value,zona:zonaFarmasi,config:datos.farmasi});
    const url='https://wa.me/'+numero+'?text='+encodeURIComponent(mensaje);$('#continuar').href=url;$('#continuar').hidden=false;$('#aviso-bolsa').className='';$('#aviso-bolsa').textContent='Disponibilidad consultada. Continúa en WhatsApp si tu navegador no abre la ventana.';window.open(url,'_blank','noopener,noreferrer');
  }catch(e){$('#aviso-bolsa').className='error';$('#aviso-bolsa').textContent=e.message||'No se pudo confirmar la disponibilidad. Intenta de nuevo.';}
  finally{validando=false;pintarBolsa();actualizarBotones();}
}

/* Carrusel sin clones: cuatro visibles, dos en celular, vuelta al inicio. */
let carruselIndice=0,carruselTimer=null,carruselPausa=false,carruselPuntero=false,carruselFoco=false,carruselTocando=false,carruselFirma='',inicioDedo=null,suprimirClickHasta=0;
const visiblesCarrusel=()=>matchMedia('(max-width:760px)').matches?2:4;
const maxCarrusel=()=>Math.max(0,$('#pista').children.length-visiblesCarrusel());
function pararCarrusel(){clearInterval(carruselTimer);carruselTimer=null;}
function arrancarCarrusel(){pararCarrusel();if(movimiento.matches||document.hidden||carruselPausa||carruselPuntero||carruselFoco||carruselTocando||$('#recientes').hidden)return;carruselTimer=setInterval(()=>irCarrusel(1),3000);}
function posicionCarrusel(){
  const pista=$('#pista'), primer=pista.children[0];if(!primer)return;carruselIndice=Math.min(carruselIndice,maxCarrusel());
  const paso=pista.children[1]?pista.children[1].offsetLeft-primer.offsetLeft:0;pista.style.transform='translateX('+(-carruselIndice*paso)+'px)';
  for(const [i,p] of [...$('#puntos').children].entries())p.setAttribute('aria-pressed',String(i===carruselIndice));
  for(const [i,a] of [...pista.children].entries()){const fuera=i<carruselIndice||i>=carruselIndice+visiblesCarrusel();a.inert=fuera;a.setAttribute('aria-hidden',String(fuera));}
}
function puntosCarrusel(){const cont=$('#puntos');cont.replaceChildren();for(let i=0;i<=maxCarrusel();i++){const b=boton('');b.setAttribute('aria-label','Ver desde la prenda '+(i+1));b.onclick=()=>{carruselIndice=i;posicionCarrusel();arrancarCarrusel();};cont.append(b);}posicionCarrusel();}
function irCarrusel(delta){const n=maxCarrusel()+1;carruselIndice=(carruselIndice+delta+n)%n;posicionCarrusel();}
function pintarRecientes(){
  const recientes=datos.articulos.filter(a=>a.linea==='Ropa').sort((a,b)=>String(b.fecha_ingreso||'').localeCompare(String(a.fecha_ingreso||''))||a.codigo.localeCompare(b.codigo)).slice(0,8);
  $('#recientes').hidden=recientes.length<5;if(recientes.length<5){pararCarrusel();return;}
  const firma=JSON.stringify(recientes);if(firma!==carruselFirma){carruselFirma=firma;$('#pista').replaceChildren(...recientes.map(a=>tarjeta([a],true)));carruselIndice=0;puntosCarrusel();}
  posicionCarrusel();arrancarCarrusel();
}
const regionCarrusel=$('#recientes');
regionCarrusel.addEventListener('mouseenter',()=>{carruselPuntero=true;pararCarrusel();});regionCarrusel.addEventListener('mouseleave',()=>{carruselPuntero=false;arrancarCarrusel();});
regionCarrusel.addEventListener('focusin',()=>{carruselFoco=true;pararCarrusel();});regionCarrusel.addEventListener('focusout',()=>{setTimeout(()=>{carruselFoco=regionCarrusel.contains(document.activeElement);arrancarCarrusel();},0);});
$('#sig').onclick=()=>{irCarrusel(1);arrancarCarrusel();};$('#ant').onclick=()=>{irCarrusel(-1);arrancarCarrusel();};
$('#pausar-carrusel').onclick=()=>{carruselPausa=!carruselPausa;$('#pausar-carrusel').setAttribute('aria-pressed',String(carruselPausa));$('#pausar-carrusel').textContent=carruselPausa?'Reanudar':'Pausar';arrancarCarrusel();};
$('#carrusel').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;inicioDedo=e.clientX;carruselTocando=true;pararCarrusel();});
window.addEventListener('pointerup',e=>{if(inicioDedo===null)return;const dx=e.clientX-inicioDedo;if(Math.abs(dx)>40){irCarrusel(dx<0?1:-1);suprimirClickHasta=Date.now()+500;}inicioDedo=null;carruselTocando=false;arrancarCarrusel();});
window.addEventListener('pointercancel',()=>{inicioDedo=null;carruselTocando=false;arrancarCarrusel();});
document.addEventListener('visibilitychange',arrancarCarrusel);movimiento.addEventListener('change',()=>{posicionCarrusel();arrancarCarrusel();});

/* Eventos. Cambiar un tono solo actualiza su tarjeta o ficha. */
function accionesProducto(e){if(Date.now()<suprimirClickHasta){e.preventDefault();return;}const b=e.target.closest('button');if(b?.dataset.detalle)abrirDetalle(b.dataset.detalle);if(b?.dataset.agregar)agregar(b.dataset.agregar);}
$('#catalogo').onclick=accionesProducto;$('#pista').onclick=accionesProducto;$('#detalle').addEventListener('click',accionesProducto);
$('#lineas').onclick=e=>{const b=e.target.closest('[data-linea]');if(!b)return;cambiarLinea(b.dataset.linea);$('#lineas [aria-pressed="true"]')?.focus();};
function bajarCatalogo(){$('#seccion-catalogo').scrollIntoView({behavior:movimiento.matches?'auto':'smooth'});}
for(const id of ['#categorias','#menu-grupos'])$(id).onclick=e=>{const b=e.target.closest('[data-grupo]');if(!b)return;const valor=b.dataset.grupo;elegirGrupo(valor);if($('#menu').open)$('#menu').close();bajarCatalogo();$('#categorias [aria-current="true"]')?.focus({preventScroll:true});};
$('.mosaico').onclick=e=>{const a=e.target.closest('[data-mosaico]');if(!a)return;e.preventDefault();linea='Ropa';elegirGrupo(a.dataset.mosaico);bajarCatalogo();$('#catalogo').focus({preventScroll:true});};
$('#tallas').onclick=e=>{const b=e.target.closest('[data-talla]');if(!b)return;talla=b.dataset.talla;pintarFiltros();pintarCuadricula();$('#tallas [aria-pressed="true"]')?.focus();};
$('#vista').onclick=e=>{const b=e.target.closest('[data-vista]');if(!b)return;guardarVista(Number(b.dataset.vista));pintarVista();$('#vista [aria-pressed="true"]')?.focus();};
$('#lista-bolsa').onclick=e=>{
  if(validando)return;const q=e.target.closest('[data-cantidad]'), quitar=e.target.closest('[data-quitar]');
  if(q){const a=bolsa.find(x=>x.codigo===q.dataset.codigo);if(!a)return;const n=a.cantidad+Number(q.dataset.cantidad);if(n<1||n>logica.limiteBolsa(a)||Number(q.dataset.cantidad)>0&&unidades()>=30)return;const propuesta=bolsa.map(x=>x===a?{...x,cantidad:n}:x),r=logica.refrescarBolsa(propuesta,datos.articulos,{enRespaldo});bolsa=r.bolsa;avisar(r.avisos);}
  else if(quitar)bolsa=bolsa.filter(a=>a.codigo!==quitar.dataset.quitar);else return;
  guardar();pintarBolsa();actualizarBotones();
  if(q)$('#lista-bolsa [data-codigo="'+q.dataset.codigo+'"][data-cantidad="'+q.dataset.cantidad+'"]')?.focus();
};
$('#abrir-bolsa').onclick=()=>{$('#aviso-bolsa').textContent=avisosBolsa;pintarBolsa();$('#bolsa').showModal();};$('#abrir-menu').onclick=()=>$('#menu').showModal();
for(const b of document.querySelectorAll('[data-cerrar]'))b.onclick=()=>$('#'+b.dataset.cerrar).close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d)d.close();});
$('#bolsa').addEventListener('close',()=>{$('#direccion-casillero').value='';invalidarEnlace();});
$('#entrega-farmasi').addEventListener('change',e=>{if(e.target.name==='opcion-farmasi')opcionFarmasi=e.target.value;else if(e.target.id==='zona-farmasi')zonaFarmasi=e.target.value;else return;guardarEntrega();pintarTotales(pintarEntrega());});
$('#direccion-casillero').addEventListener('input',()=>{invalidarEnlace();pintarTotales(pintarEntrega());});
$('#entrega').onchange=invalidarEnlace;
/* La continuación nativa permite abrir WhatsApp aunque se bloquee la ventana automática.
   Cualquier cambio de bolsa, dirección o entrega invalida este enlace. */
$('#continuar').onclick=e=>{if(validando||!estadoEntrega().valido)e.preventDefault();};$('#pedir').onclick=pedir;
window.addEventListener('popstate',()=>{desdeUrl();pintarFiltros();pintarCuadricula();});window.addEventListener('hashchange',()=>{desdeUrl();pintarFiltros();pintarCuadricula();});
let anchoPrevio=opcionesVista().join('');window.addEventListener('resize',()=>{const a=opcionesVista().join('');if(a!==anchoPrevio){anchoPrevio=a;pintarVista();}if(!$('#recientes').hidden)puntosCarrusel();});

/* El recurso suministrado monta las capas, pero sus índices de clase están desplazados.
   Se restauran las clases en el DOM sin modificar marca/logo-animado.js. */
function iniciarLogos(){
  if(!window.SheepiLogo)return;
  const clases=['cara','ojo ojo-izq','ojo ojo-der','letra','letra','letra','letra','letra','letra','flor'];
  for(const el of document.querySelectorAll('.logo-anim')){SheepiLogo.montar(el);[...el.children].forEach((img,i)=>{if(i<clases.length){img.className=clases[i];if(i>=3&&i<=8)img.style.setProperty('--i',i-3);}});}
  const logo=$('#logo-carga');logo.style.setProperty('--dist',(innerWidth*.7)+'px');SheepiLogo.animar(logo,movimiento.matches?'':'aparece');
}
function cerrarCarga(){setTimeout(()=>{$('#carga').classList.add('fuera');},Math.max(0,2200-(Date.now()-inicioCarga)));}
if(location.hash==='#sin-carga')$('#carga').classList.add('fuera');
window.addEventListener('hashchange',()=>{if(location.hash==='#sin-carga')$('#carga').classList.add('fuera');});
iniciarLogos();
async function iniciar(){consultando=true;$('#abrir-bolsa').disabled=true;pintarVista();try{await cargarDatos();}catch(e){$('#aviso').textContent=e.message||'No se pudo cargar el catálogo. Intenta de nuevo más tarde.';$('#aviso').className='error';}finally{consultando=false;$('#abrir-bolsa').disabled=!catalogoCargado;cerrarCarga();}}
iniciar();
setInterval(async()=>{if(validando||consultando||document.hidden||$('#bolsa').open||$('#detalle').open||$('#menu').open||!catalogoCargado)return;consultando=true;try{await cargarDatos();}catch(e){/* Se conserva el catálogo visible. */}finally{consultando=false;}},60000);
