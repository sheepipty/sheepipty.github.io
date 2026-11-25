// GENERADO desde compartido/logica.js — no editar — sha256:5552b17ea34b485227d94249d981f4099f5811fbfc07a5d70e12a25d4feb1d0b
/* Fuente única de reglas puras: Apps Script, navegador y Node. */
(function (raiz) {
  'use strict';
  const exigir = (condicion, texto) => { if (!condicion) throw new Error(texto); };
  function validarMonto(valor, texto='Ingresa un monto válido, mayor o igual a cero, con máximo 2 decimales y hasta $100000.') {
    const n=Number(valor), c=Math.round(n*100);
    exigir((typeof valor==='number'||typeof valor==='string'&&valor.trim()!=='') && Number.isFinite(n) && n>=0 && n<=100000 && n===c/100, texto);
    return c;
  }
  const centavos = valor => validarMonto(valor);
  function validarCantidad(valor) {
    exigir(Number.isInteger(valor)&&valor>=1&&valor<=30,'Ingresa una cantidad entera entre 1 y 30.'); return valor;
  }
  const esCodigo = c => typeof c==='string' && /^(NC|AC|SB)-\d{3,5}$/.test(c);
  function lineaDeCodigo(c) {
    exigir(esCodigo(c),'Código inválido.'); return {NC:'Ropa',AC:'Accesorios',SB:'Salud y belleza'}[c.slice(0,2)];
  }
  /* Separador de miles como se usa en Panamá (\,525); sin decimales si son ,00; el signo va antes del símbolo (-$1.50). */
  const dinero = valor => {const n=Math.round(Number(valor)*100)/100;return (n<0?'-':'')+'$' + Math.abs(n).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');};
  function siguienteCodigo(codigos, prefijo='NC') {
    exigir(['NC','AC','SB'].includes(prefijo),'El prefijo no es válido.');
    const siguiente=codigos.reduce((max,c)=>esCodigo(c)&&c.startsWith(prefijo+'-')?Math.max(max,Number(c.slice(3))):max,0)+1;
    exigir(siguiente<=99999,'Se agotaron los códigos de '+prefijo+'.');
    return prefijo+'-'+String(siguiente).padStart(3,'0');
  }
  function totalBolsa(items, combos = {3:12, 5:18}) {
    exigir(Array.isArray(items), 'La bolsa no es válida.');
    exigir(new Set(items.map(x=>x.codigo)).size === items.length, 'Hay códigos repetidos en la bolsa.');
    items.forEach(x=>{exigir(esCodigo(x.codigo), 'Código de prenda inválido.'); centavos(x.precio); validarCantidad(x.cantidad===undefined?1:x.cantidad);});
    const participa=x=>x.combo===true&&(x.linea===undefined?'Ropa':x.linea)==='Ropa'&&!esEncargo(x);
    const unidad=x=>({...x,cantidad:1});
    const elegibles = items.filter(participa).map(unidad).sort((a,b)=>centavos(b.precio)-centavos(a.precio) || a.codigo.localeCompare(b.codigo));
    const otros = items.flatMap(x=>Array.from({length:(x.cantidad===undefined?1:x.cantidad)-(participa(x)?1:0)},()=>unidad(x)));
    const dp = [{costo:0, grupos:[]}];
    for (let i=1; i<=elegibles.length; i++) {
      const art=elegibles[i-1];
      let mejor={costo:dp[i-1].costo+centavos(art.precio), grupos:dp[i-1].grupos.concat([{tipo:0,codigos:[art.codigo],items:[art],total:Number(art.precio)}])};
      for (const n of [3,5]) if (i>=n && combos[n] !== undefined) {
        const costo=dp[i-n].costo+centavos(combos[n]);
        if(costo<mejor.costo) {
          const grupo=elegibles.slice(i-n,i);
          mejor={costo,grupos:dp[i-n].grupos.concat([{tipo:n,codigos:grupo.map(x=>x.codigo),items:grupo,total:Number(combos[n])}])};
        }
      }
      dp.push(mejor);
    }
    const grupos=dp[elegibles.length].grupos.concat(otros.map(x=>({tipo:0,codigos:[x.codigo],items:[x],total:Number(x.precio)})));
    const subtotal=items.reduce((s,x)=>s+centavos(x.precio)*(x.cantidad===undefined?1:x.cantidad),0);
    const total=dp[elegibles.length].costo+otros.reduce((s,x)=>s+centavos(x.precio),0);
    exigir(total<=10000000,'El total de la bolsa no puede superar $100000.');
    return {subtotal:subtotal/100,total:total/100,descuento:(subtotal-total)/100,grupos};
  }
  function prorratear(grupos) {
    const acumulado=new Map();
    grupos.forEach(g=>{
      exigir(g.items.length>0,'El grupo no puede estar vacío.');
      const base=g.items.reduce((s,x)=>s+centavos(x.precio),0), objetivo=centavos(g.total);
      const partes=g.items.map(x=>({codigo:x.codigo,precio:x.precio,centavos:base?Math.round(objetivo*centavos(x.precio)/base):0}));
      const cara=partes.reduce((a,b)=>Number(b.precio)>Number(a.precio)||Number(b.precio)===Number(a.precio)&&b.codigo<a.codigo?b:a);
      cara.centavos+=objetivo-partes.reduce((s,x)=>s+x.centavos,0);
      partes.forEach(x=>{
        const a=acumulado.get(x.codigo)||{codigo:x.codigo,cantidad:0,centavos:0};
        a.cantidad++; a.centavos+=x.centavos; acumulado.set(x.codigo,a);
      });
    });
    return Array.from(acumulado.values(),x=>({codigo:x.codigo,cantidad:x.cantidad,monto:x.centavos/100}));
  }
  function validarVenta(d) {
    exigir(Array.isArray(d.codigos) && d.codigos.length>0 && d.codigos.length<=30, 'Elige entre 1 y 30 prendas.');
    exigir(new Set(d.codigos).size===d.codigos.length, 'Hay códigos repetidos.');
    d.codigos.forEach(c=>exigir(esCodigo(c),'Código inválido.'));
    exigir(['Yappy','Transferencia BAC','Efectivo','Otro'].includes(d.medio), 'Elige un medio de pago válido.');
    exigir(d.medio==='Efectivo'||String(d.referencia||'').trim(), 'Ingresa la referencia del pago.');
    exigir(['Delivery','Retiro'].includes(d.entrega), 'Elige Delivery o Retiro.');
    exigir(['WhatsApp','Instagram','Facebook','En persona','Otro'].includes(d.canal), 'Elige el canal de venta.');
    centavos(d.envio ?? 0);
    exigir(d.entrega!=='Retiro'||centavos(d.envio ?? 0)===0,'El retiro no lleva envío cobrado.');
    fecha(d.fecha); return d;
  }
  function fecha(valor) {
    const f=new Date(valor+'T12:00:00Z');
    exigir(/^\d{4}-\d{2}-\d{2}$/.test(valor||'') && Number.isFinite(f.getTime()) && f.toISOString().slice(0,10)===valor,'Ingresa una fecha válida (AAAA-MM-DD).'); return valor;
  }
  function validarPrenda(d) {
    const linea=d['Línea']===undefined?'Ropa':d['Línea'], modalidad=d.Modalidad===undefined?'Propia':d.Modalidad;
    exigir(['Ropa','Accesorios','Salud y belleza'].includes(linea),'Elige una línea válida.');
    exigir(['Propia','Consignación','Encargo'].includes(modalidad),'Elige una modalidad válida.');
    exigir(linea!=='Salud y belleza'||modalidad==='Encargo'||modalidad==='Propia'&&d.origenInventario===true,'Salud y belleza se vende solo por encargo.');
    exigir(modalidad!=='Encargo'||linea==='Salud y belleza','Encargo solo está disponible en Salud y belleza.');
    const campos=['Categoría','Descripción'];
    if(linea==='Ropa') campos.push('Talla');
    if(linea!=='Salud y belleza') campos.push('Estado físico');
    campos.forEach(k=>exigir(String(d[k]||'').trim(),'Completa '+k+'.'));
    if(d['Estado físico']||linea!=='Salud y belleza') exigir((linea==='Ropa'?['Excelente','Bueno','Regular']:['Excelente','Bueno','Regular','Nuevo']).includes(d['Estado físico']),'El estado físico no es válido.');
    centavos(d['Precio aprobado ($)']);
    if(modalidad==='Encargo') {
      exigir(String(d['Tiempo de entrega']||'').trim(),'Completa Tiempo de entrega.');
      exigir(Number.isInteger(d['Máximo por pedido'])&&d['Máximo por pedido']>=1&&d['Máximo por pedido']<=10,'Ingresa un máximo por pedido entero entre 1 y 10.');
    }
    if(modalidad!=='Propia') exigir(String(d['ID dueño']||'').trim(),'Completa ID dueño.');
    else exigir(!String(d['ID dueño']||'').trim(),'Una pieza propia no lleva dueño.');
    validarAcuerdo({modalidad,acuerdo:d.Acuerdo,parte:d['Parte del dueño'],precio:d['Precio aprobado ($)']});
    if(modalidad!=='Encargo') {
      const inicial=d['Existencia inicial'], actual=d.Existencia;
      if(inicial!==undefined) exigir(Number.isInteger(inicial)&&inicial>=1&&(linea!=='Ropa'||inicial===1),'La existencia inicial debe ser entera y en Ropa debe ser 1.');
      if(actual!==undefined) exigir(Number.isInteger(actual)&&actual>=0&&(inicial===undefined||actual<=inicial)&&(linea!=='Ropa'||actual<=1),'La existencia debe ser entera, no superar la inicial y en Ropa debe ser 0 o 1.');
    }
    return d;
  }
  function mensajeWhatsApp(items, entrega, marca, combos={3:12,5:18}, farmasi) {
    const t=totalBolsa(items,combos);
    const renglon=x=>'• '+x.codigo+' '+x.descripcion+(x.talla?' ('+x.talla+')':'')+((x.cantidad??1)>1?' (×'+x.cantidad+')':'')+' '+dinero(centavos(x.precio)*(x.cantidad??1)/100);
    const encargos=items.filter(esEncargo), inmediatos=items.filter(x=>!esEncargo(x));
    const cuerpo=encargos.length?'Entrega inmediata\n'+(inmediatos.map(renglon).join('\n')||'Sin productos.')+'\nSubtotal '+dinero(totalBolsa(inmediatos,combos).subtotal)+'\n\nPor encargo (envío por confirmar, se pide anticipo)\n'+encargos.map(renglon).join('\n')+'\nSubtotal '+dinero(totalBolsa(encargos,combos).subtotal):items.map(renglon).join('\n');
    const original='Hola, me interesan estas prendas de '+marca+':\n'+cuerpo+
      '\nSubtotal '+dinero(t.subtotal)+' · Total '+dinero(t.total)+'\nEntrega: '+entrega+'\n¿Me confirmas disponibilidad '+(entrega==='Retiro'?'para coordinar el retiro?':'y el costo del envío?')+
      (encargos.length?'\nLos encargos llevan anticipo y el envío se confirma por WhatsApp.':'');
    if(!items.some(esFarmasi)||!farmasi) return original;
    const c=cargosFarmasi({items,...farmasi});
    /* La ruta anterior conserva el texto exacto. Esta presentación se activa
       únicamente con opciones Farmasi e ítems Farmasi en la misma bolsa. */
    const propios=items.filter(esFarmasi),otros=items.filter(x=>!esFarmasi(x));
    const listos=otros.filter(x=>!esEncargo(x)),otrosEncargos=otros.filter(esEncargo);
    const conRopa=items.some(x=>(x.linea??x['Línea']??lineaDeCodigo(x.codigo))==='Ropa');
    const lineaProducto=x=>'• '+x.codigo+' '+x.descripcion+(x.variante?' · '+x.variante:'')+(x.talla?' ('+x.talla+')':'')+((x.cantidad??1)>1?' (×'+x.cantidad+')':'')+' '+dinero(centavos(x.precio)*(x.cantidad??1)/100);
    const bloques=['Hola, me interesan '+(conRopa?'estas prendas y productos':'estos productos')+' de '+marca+':'];
    if(listos.length)bloques.push('Entrega inmediata\n'+listos.map(lineaProducto).join('\n'));
    if(otrosEncargos.length)bloques.push('Por encargo (envío por confirmar, se pide anticipo)\n'+otrosEncargos.map(lineaProducto).join('\n'));
    bloques.push('Farmasi · '+farmasi.opcion+'\n'+propios.map(lineaProducto).join('\n')+
      (farmasi.opcion==='Mi casillero'?'\nDirección de mi casillero: '+String(farmasi.direccion??''):'\nZona: '+String(farmasi.zona||'')));
    const cargos=farmasi.opcion==='Mi casillero'?[]:[['Traída',c.traida],['Entrega',c.entrega],['Gestión',c.gestion]].filter(([,monto])=>monto>0).map(([nombre,monto])=>nombre+': '+dinero(monto));
    if(cargos.length)bloques.push(cargos.join(' · '));
    const total=(centavos(t.total)+centavos(c.traida)+centavos(c.entrega)+centavos(c.gestion))/100;
    bloques.push('Subtotal '+dinero(t.subtotal)+' · Total '+dinero(total));
    if(otros.length)bloques.push('Entrega: '+entrega+'\n¿Me confirmas disponibilidad '+(entrega==='Retiro'?'para coordinar el retiro?':'y el costo del envío?'));
    if(otrosEncargos.length)bloques.push('Los encargos llevan anticipo y el envío se confirma por WhatsApp.');
    bloques.push('Se paga el total al confirmar el pedido.');
    if(c.aviso)bloques.push(c.aviso);
    return bloques.join('\n');
  }
  function mensajeCobro(venta, config) {
    return 'Gracias por elegir '+config.MARCA+'.\nPrendas: '+(venta.Prendas||venta.codigos?.join(', '))+
      '\nTotal: '+dinero(venta['Total cobrado ($)'] ?? venta.total)+
      '\nYappy: '+(config.YAPPY_NUMERO||'Pendiente de configurar')+
      '\nTransferencia BAC: '+(config.BAC_CUENTA||'Pendiente de configurar')+
      '\nTitular: '+(config.BAC_TITULAR||'Pendiente de configurar')+
      '\nRetiro: '+(config.RETIRO_LUGAR_PRIVADO||'Por coordinar')+'.';
  }
  function idFoto(enlace) { const m=/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)(?:\/|$)/.exec(String(enlace||'')); return m?m[1]:''; }
  const esObservacionPublica=texto=>!!String(texto||'').trim()&&!/^Ninguno/i.test(String(texto).trim());
  const EUR_A_LETRA={32:'XXS',34:'XS',36:'S',38:'M',40:'L',42:'XL',44:'XXL',46:'3XL'};
  /* Talla corta para filtrar; el texto completo del Sheet se sigue mostrando en el detalle. */
  /* Nombre corto de vitrina (2026-11-24): primera frase de la descripción, hasta 4 palabras,
   * sin cortar un complemento "de …" a la mitad ni terminar en palabra vacía. Se usa cuando
   * Inventario.Nombre está vacío y para sugerir el nombre inicial. */
  const VACIAS_NOMBRE=['de','del','con','y','a','en','la','el','las','los','tipo','modelo','sin','e','o'];
  const MAX_NOMBRE=40;
  function nombreCorto(texto,max=4) {
    const todas=String(texto||'').trim().split(/[,:;(]/)[0].split(/\s+(?:con|modelo|tipo)\s+/i)[0].trim().split(/\s+/).filter(Boolean);
    let p=todas.slice(0,max);
    if(todas.length>max&&p.length>=4&&p[max-2].toLowerCase()==='de') p=p.slice(0,max-2);
    while(p.length>1&&VACIAS_NOMBRE.includes(p[p.length-1].toLowerCase())) p.pop();
    return p.join(' ').slice(0,MAX_NOMBRE);
  }
  function validarNombre(texto) {
    const n=String(texto??'').trim();
    exigir(n.length<=MAX_NOMBRE,'El nombre corto admite hasta '+MAX_NOMBRE+' caracteres.');
    return n;
  }
  function tallaCorta(texto) {
    const t=String(texto||'').trim(), mayus=t.toUpperCase();
    if(/^(ONE SIZE|TALLA ÚNICA|TALLA UNICA|ÚNICA|UNICA)$/.test(mayus)) return 'ÚNICA';
    const letra=/(?:^|[^A-Z0-9])(3XL|XXS|XXL|XS|XL|S|M|L)(?=$|[^A-Z0-9])/.exec(mayus);
    if(letra) return letra[1];
    const eur=/EUR\s*(\d{2})/.exec(mayus)||/\d{1,2}\s*\/\s*(\d{2})(?!\d)/.exec(mayus);
    if(eur && EUR_A_LETRA[eur[1]]) return EUR_A_LETRA[eur[1]];
    if(/^\d{2}$/.test(t)) return t;
    return 'VARIAS';
  }
  function validarAcuerdo({modalidad, acuerdo, parte, precio}) {
    exigir(['Propia','Consignación','Encargo'].includes(modalidad),'Elige una modalidad válida.');
    if(modalidad==='Propia') return {acuerdo:'',parteCentavos:0};
    exigir(['Porcentaje dueño','Monto fijo dueño'].includes(acuerdo),'Elige un acuerdo válido.');
    exigir(modalidad!=='Encargo'||acuerdo==='Monto fijo dueño','Un encargo exige Monto fijo dueño.');
    const p=validarMonto(parte,'Ingresa una parte del dueño válida, con máximo 2 decimales.');
    if(acuerdo==='Porcentaje dueño') exigir(p>=100&&p<=9900,'El porcentaje del dueño debe estar entre 1 y 99.');
    else exigir(p>=1&&p<centavos(precio),'El monto fijo del dueño debe ser al menos $0.01 y menor que el precio.');
    return {acuerdo,parteCentavos:p};
  }
  function enteroCentavos(valor, texto='Ingresa centavos enteros, mayores o iguales a cero.') {
    exigir(Number.isSafeInteger(valor)&&valor>=0,texto); return valor;
  }
  function parteDueno({montoCobradoCentavos, cantidad, acuerdo, parteCentavos}) {
    enteroCentavos(montoCobradoCentavos); validarCantidad(cantidad); enteroCentavos(parteCentavos);
    exigir(['','Propia','Porcentaje dueño','Monto fijo dueño'].includes(acuerdo),'El acuerdo no es válido.');
    if(acuerdo==='Porcentaje dueño') exigir(parteCentavos>=100&&parteCentavos<=9900,'El porcentaje del dueño debe estar entre 1 y 99.');
    const duenoCentavos=acuerdo==='Porcentaje dueño'?Math.floor((montoCobradoCentavos*parteCentavos+5000)/10000):acuerdo==='Monto fijo dueño'?parteCentavos*cantidad:0;
    exigir(Number.isSafeInteger(duenoCentavos),'El monto del dueño es demasiado grande.');
    const sheepiCentavos=montoCobradoCentavos-duenoCentavos;
    return {duenoCentavos,sheepiCentavos,margenNegativo:sheepiCentavos<0};
  }
  function repartirReversion({duenoCentavos, cantidadVendida, devueltasAntes, cantidad}) {
    enteroCentavos(duenoCentavos); validarCantidad(cantidadVendida); validarCantidad(cantidad);
    exigir(Number.isInteger(devueltasAntes)&&devueltasAntes>=0&&devueltasAntes+cantidad<=cantidadVendida,'La devolución excede la cantidad vendida.');
    const unidad=Math.floor(duenoCentavos/cantidadVendida);
    return devueltasAntes+cantidad===cantidadVendida?duenoCentavos-unidad*devueltasAntes:unidad*cantidad;
  }
  function repartirReembolso({cobradoCentavos, reembolsadoAntes, reembolso}) {
    enteroCentavos(cobradoCentavos); enteroCentavos(reembolsadoAntes); enteroCentavos(reembolso);
    exigir(reembolsadoAntes+reembolso<=cobradoCentavos,'El reembolso acumulado excede lo cobrado.'); return reembolso;
  }
  function sumaPago(saldosCentavos) {
    exigir(Array.isArray(saldosCentavos)&&saldosCentavos.every(Number.isSafeInteger),'Los saldos deben estar en centavos enteros.');
    const total=saldosCentavos.reduce((s,x)=>s+x,0);
    exigir(Number.isSafeInteger(total),'El saldo es demasiado grande.');
    exigir(total>0,'El dueño tiene saldo a favor de Sheepi; se compensa con sus próximas ventas.'); return total;
  }
  // Formato puro: IDs en id/idLinea/idDueno y montos firmados en montoCentavos.
  // También admite encabezados de hoja; Monto ($) y Monto aplicado ($) están en dólares.
  function montoFirmado(fila, campoHoja) {
    const valor=fila.montoCentavos;
    if(valor!==undefined) { exigir(Number.isSafeInteger(valor),'El monto debe estar en centavos enteros.'); return valor; }
    const n=Number(fila[campoHoja]);
    exigir(fila[campoHoja]!==''&&fila[campoHoja]!==null&&Number.isFinite(n),'Ingresa un monto firmado válido.');
    return (n<0?-1:1)*validarMonto(Math.abs(n));
  }
  const campo=(fila, simple, hoja)=>fila[simple]??fila[hoja];
  function antesDelCierre(fila, hasta) {
    const f=campo(fila,'fecha','Fecha'); fecha(f); return hasta===undefined||f<=hasta;
  }
  function saldos({lineas, aplicaciones, hasta}) {
    if(hasta!==undefined) fecha(hasta);
    const porLinea=Object.create(null), porDueno=Object.create(null), duenos=new Map(), ids=new Set();
    lineas.forEach(l=>{
      const id=campo(l,'id','ID'), dueno=campo(l,'idDueno','ID dueño');
      exigir(typeof id==='string'&&id&&typeof dueno==='string'&&dueno,'Completa el ID de línea y de dueño.');
      exigir(!ids.has(id),'Hay líneas de deuda repetidas.'); ids.add(id);
      if(!antesDelCierre(l,hasta)) return;
      porLinea[id]=montoFirmado(l,'Monto ($)'); duenos.set(id,dueno);
    });
    aplicaciones.forEach(a=>{
      if(!antesDelCierre(a,hasta)) return;
      const id=campo(a,'idLinea','ID línea');
      exigir(duenos.has(id),'La aplicación no tiene una línea vigente al cierre.');
      porLinea[id]-=montoFirmado(a,'Monto aplicado ($)');
    });
    duenos.forEach((dueno,id)=>{porDueno[dueno]=(porDueno[dueno]||0)+porLinea[id];});
    return {porDueno:{...porDueno},porLinea:{...porLinea}};
  }
  function anticiposSinAplicar(movimientos, hasta) {
    if(hasta!==undefined) fecha(hasta);
    return movimientos.reduce((s,m)=>{
      if(!['Anticipo','Aplicación anticipo','Devolución anticipo'].includes(campo(m,'tipo','Tipo'))) return s;
      return antesDelCierre(m,hasta)?s+montoFirmado(m,'Monto ($)'):s;
    },0);
  }
  const TRANSICIONES_ENCARGO=Object.freeze({
    cotizarEncargo:Object.freeze({'':'Cotizado'}),
    confirmarEncargo:Object.freeze({Cotizado:'Confirmado'}),
    pedirAlProveedor:Object.freeze({Confirmado:'Pedido'}),
    recibirEncargo:Object.freeze({Pedido:'Recibido'}),
    entregarEncargo:Object.freeze({Recibido:'Entregado'}),
    cancelarEncargo:Object.freeze({Cotizado:'Cancelado',Confirmado:'Cancelado'}),
    noRetirado:Object.freeze({Recibido:'Cancelado'})
  });
  function transicionEncargo(estado, accion) {
    const desde=estado??'', tabla=Object.prototype.hasOwnProperty.call(TRANSICIONES_ENCARGO,accion)?TRANSICIONES_ENCARGO[accion]:undefined;
    exigir(tabla&&Object.prototype.hasOwnProperty.call(tabla,desde),'No puedes '+accion+' un encargo en estado '+(desde||'sin cotizar')+'.');
    return tabla[desde];
  }
  function cierreCancelacion({anticipoCobradoCentavos, reembolsoCentavos}) {
    enteroCentavos(anticipoCobradoCentavos); enteroCentavos(reembolsoCentavos);
    exigir(reembolsoCentavos<=anticipoCobradoCentavos,'El reembolso no puede superar el anticipo cobrado.');
    return {reembolso:reembolsoCentavos,retenido:anticipoCobradoCentavos-reembolsoCentavos};
  }
  function estadoConsignacion(fechaLimite, hoy, avisoDias=7) {
    fecha(fechaLimite); fecha(hoy);
    exigir(Number.isInteger(avisoDias)&&avisoDias>=0,'Los días de aviso deben ser un entero mayor o igual a cero.');
    const dias=(Date.parse(fechaLimite+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/86400000;
    return dias<0?'vencida':dias<=avisoDias?'por vencer':'vigente';
  }
  function consignacionesPorVencer(filas, hoy, avisoDias=7) {
    fecha(hoy);
    const vencidas=[], porVencer=[];
    filas.forEach(f=>{
      if(f.Modalidad!=='Consignación'||!(Number(f.Existencia)>0)) return;
      const estado=estadoConsignacion(f['Fecha límite'],hoy,avisoDias);
      if(estado==='vencida') vencidas.push(f);
      if(estado==='por vencer') porVencer.push(f);
    });
    return {vencidas,porVencer};
  }
  function mensajeEstadoCuenta({dueno, ventas=[], devoluciones=[], pagos=[], piezas=[], saldoCentavos, desde, hasta, marca}) {
    const importe=x=>dinero(enteroCentavos(x)/100);
    exigir(Number.isSafeInteger(saldoCentavos),'El saldo debe estar en centavos enteros.');
    const seccion=(titulo,filas,formato)=>'\n'+titulo+':\n'+(filas.map(formato).join('\n')||'Sin movimientos.');
    return 'Hola, '+dueno.nombre+'. Este es tu estado de cuenta de '+marca+' del '+desde+' al '+hasta+'.'+
      seccion('Ventas',ventas,v=>'• '+v.fecha+' '+v.codigo+' ×'+v.cantidad+' · Cobrado '+importe(v.cobradoCentavos)+' · Tu parte '+importe(v.duenoCentavos))+
      seccion('Devoluciones',devoluciones,v=>'• '+v.fecha+' '+v.codigo+' ×'+v.cantidad+' · Reversión '+importe(v.duenoCentavos))+
      seccion('Pagos',pagos,p=>'• '+p.fecha+' · '+importe(p.montoCentavos))+
      '\nSaldo: '+dinero(saldoCentavos/100)+
      seccion('Piezas en tienda',piezas,p=>'• '+p.codigo+' ×'+p.existencia+' · Fecha límite '+p.fechaLimite)+
      '\nSi tienes alguna consulta, escríbeme.';
  }
  function mensajeVentaDueno({dueno, codigo, descripcion, cantidad, cobradoCentavos, duenoCentavos, fecha:dia, marca}) {
    return 'Hola, '+dueno.nombre+'. En '+marca+' vendimos '+codigo+' '+descripcion+' (×'+validarCantidad(cantidad)+') el '+fecha(dia)+'. Cobrado: '+dinero(enteroCentavos(cobradoCentavos)/100)+'. Tu parte: '+dinero(enteroCentavos(duenoCentavos)/100)+'.';
  }
  function mensajeCotizacion({encargo, productos, marca}) {
    return 'Hola, '+encargo.cliente+'. Esta es tu cotización de '+marca+' ('+encargo.id+'):\n'+
      productos.map(p=>'• '+p.codigo+' '+p.descripcion+' (×'+validarCantidad(p.cantidad)+') '+dinero(centavos(p.precio)*p.cantidad/100)).join('\n')+
      '\nTotal: '+dinero(enteroCentavos(encargo.totalCentavos)/100)+'. Anticipo: '+dinero(enteroCentavos(encargo.anticipoCentavos)/100)+
      '. Entrega estimada: '+fecha(encargo.entregaEstimada)+'.'+
      (encargo.opcionEntrega?'\nOpción de entrega: '+encargo.opcionEntrega+(encargo.zona?' · Zona: '+encargo.zona:'')+'\nCargos de traída, entrega y gestión: '+dinero(enteroCentavos(encargo.envioCentavos??0)/100):'')+
      (encargo.opcionEntrega==='Mi casillero'?'\nEl envío de Farmasi y el flete a Panamá se confirman al cotizar; pagas el flete a tu courier.':'')+
      (productos.some(p=>(p.linea??p['Línea'])==='Salud y belleza')?'\nVenta final: por higiene, no se aceptan devoluciones.':'')+
      '\nConfírmame si deseas encargarlo.';
  }
  // Un único punto de comparación para API, panel y bolsas anteriores.
  function esEncargo(a) {return String(a.modalidad||'').toLowerCase()==='encargo';}
  function limiteBolsa(a) {
    const n=esEncargo(a)?a.maximo:a.existencia;
    return n===undefined&&!esEncargo(a)?1:Number.isInteger(n)&&n>=1?Math.min(n,30):0;
  }
  function refrescarBolsa(bolsa, articulos, opciones={}) {
    const mapa=new Map(articulos.map(a=>[a.codigo,a])), vistos=new Set(), nueva=[], avisos=[];
    let restantes=30;
    bolsa.forEach(viejo=>{
      const codigo=viejo.codigo, actual=mapa.get(codigo);
      if(vistos.has(codigo))return; vistos.add(codigo);
      if(!esCodigo(codigo)||!actual) {avisos.push(codigo+': ya no está disponible; lo quitamos de tu bolsa.');return;}
      if(esEncargo(viejo)!==esEncargo(actual)) {avisos.push(codigo+': cambió la forma de entrega; lo quitamos de tu bolsa.');return;}
      if(opciones.enRespaldo&&esEncargo(actual)) {avisos.push(codigo+': disponible solo en línea; lo quitamos de tu bolsa.');return;}
      const solicitada=viejo.cantidad===undefined?1:viejo.cantidad;
      const cantidad=Math.min(Number.isInteger(solicitada)&&solicitada>0?solicitada:1,limiteBolsa(actual),restantes);
      if(!cantidad) {avisos.push(codigo+': lo quitamos por el límite de unidades disponibles.');return;}
      if(cantidad!==solicitada) avisos.push(codigo+': ajustamos la cantidad a '+cantidad+'.');
      nueva.push({...actual,cantidad});restantes-=cantidad;
    });
    return {bolsa:nueva,avisos};
  }
  /* Farmasi: importes externos en dólares; toda suma y umbral se resuelve en centavos. */
  function descuentoFarmasi(pct,porDefecto=20) {
    const valor=pct===undefined||pct===null||pct===''?porDefecto:pct,n=Number(valor);
    exigir((typeof valor==='number'||typeof valor==='string'&&valor.trim()!=='')&&Number.isFinite(n)&&n>=0&&n<=50&&n===Math.round(n*100)/100,'El descuento debe estar entre 0 % y 50 %.');
    return n;
  }
  function precioSheepi(publico,pct) {
    const c=centavos(publico),p=Number(pct);
    exigir(c>0&&Number.isFinite(p)&&p>=0&&p<100,'El precio público y el descuento no son válidos.');
    return Math.round((c*(100-p)+Number.EPSILON*c)/100)/100;
  }
  /* D061 (2026-11-24): precio de venta terminado en .99; bajo $10, en .49 o .99. Nunca bajo el costo ni sobre
   * el precio público; si ningún final cabe entre ambos, se deja el precio acotado sin redondear. */
  function redondeoVenta(precio,{costo=0,publico=Infinity}={}) {
    const c=centavos(precio),min=centavos(costo),max=publico===Infinity?Infinity:centavos(publico);
    exigir(c>0&&min<=max,'El precio, el costo o el precio público no son válidos.');
    const paso=c<1000?50:100,cand=k=>k*paso-1;
    let k=Math.round((c+1)/paso),r=cand(k);
    while(r<min&&cand(k+1)<=max){k++;r=cand(k);}
    while(r>max&&cand(k-1)>=min){k--;r=cand(k);}
    if(r<min||r>max||r<=0) r=Math.min(Math.max(c,min),max);
    return r/100;
  }
  /* D060: descuento por producto ("20 %", "35", 35) entre 0 y 50; vacío → porDefecto. */
  function porcentajeFarmasi(valor,porDefecto=20) {
    const t=String(valor??'').replace('%','').trim();
    return descuentoFarmasi(t===''?undefined:t,porDefecto);
  }
  /* Precio Sheepi de venta (D056/D060/D061): público menos el descuento, redondeado; el costo es el 50 % del público. */
  function precioVentaFarmasi(publico,pct) {
    return redondeoVenta(precioSheepi(publico,pct),{costo:precioSheepi(publico,50),publico:centavos(publico)/100});
  }
  /* D057: reparte un total (centavos) entre líneas en proporción a su costo (centavos); el residuo
   * va a la línea de mayor costo (empate: id menor). Sin base, reparte por partes iguales. */
  function repartirPorValor(lineas,totalCentavos) {
    exigir(Array.isArray(lineas)&&lineas.length>0,'El lote no tiene líneas para repartir.');
    exigir(Number.isInteger(totalCentavos),'El total a repartir no es válido.');
    const base=lineas.reduce((s,x)=>s+x.costo,0),reparto={};
    lineas.forEach(x=>{reparto[x.id]=base?Math.floor(totalCentavos*x.costo/base):Math.floor(totalCentavos/lineas.length);});
    const mayor=lineas.reduce((a,b)=>b.costo>a.costo||b.costo===a.costo&&String(b.id)<String(a.id)?b:a);
    reparto[mayor.id]+=totalCentavos-Object.values(reparto).reduce((s,x)=>s+x,0);
    return reparto;
  }
  /* Costos vigentes: sin las filas de anulación ni las filas anuladas. */
  function costosVigentes(costos) {
    const anulados=new Set(costos.filter(c=>c.anulaA).map(c=>c.anulaA));
    return costos.filter(c=>!c.anulaA&&!anulados.has(c.id));
  }
  /* D057 §10.4: conciliación por encargo, lote y mes, todo en centavos. */
  function conciliacionFarmasi({encargos=[],lineas=[],costos=[]}) {
    const vigentes=costosVigentes(costos),activos=encargos.filter(e=>e.estado!=='Cancelado');
    const costoLinea=l=>l.cantidad*(l.costoRealCentavos??l.costoEstimadoCentavos);
    const porEncargo=activos.map(e=>{
      const propias=lineas.filter(l=>l.idEncargo===e.id);
      return {id:e.id,lote:e.lote||'',mes:String(e.fecha||'').slice(0,7),estado:e.estado,cobrado:e.totalCentavos,cargosCobrados:e.envioCentavos,
        costoEstimado:propias.reduce((s,l)=>s+l.cantidad*l.costoEstimadoCentavos,0),costoProductos:propias.reduce((s,l)=>s+costoLinea(l),0),parteLote:0,
        individuales:vigentes.filter(c=>c.idEncargo===e.id).reduce((s,c)=>s+c.montoCentavos,0)};
    });
    const lotes=[...new Set(porEncargo.map(e=>e.lote).concat(vigentes.map(c=>c.lote)).filter(Boolean))].sort();
    const porLote=lotes.map(id=>{
      const suyos=porEncargo.filter(e=>e.lote===id),total=vigentes.filter(c=>c.lote===id&&!c.idEncargo).reduce((s,c)=>s+c.montoCentavos,0);
      if(total&&suyos.length){
        const reparto=repartirPorValor(suyos.map(e=>({id:e.id,costo:e.costoProductos})),total);
        suyos.forEach(e=>{e.parteLote=reparto[e.id];});
      }
      const individuales=suyos.reduce((s,e)=>s+e.individuales,0),cargos=suyos.reduce((s,e)=>s+e.cargosCobrados,0);
      return {id,encargos:suyos.map(e=>e.id),cargosCobrados:cargos,costosLote:total,individuales,diferencia:cargos-total-individuales};
    });
    porEncargo.forEach(e=>{
      e.gananciaEstimada=e.cobrado-e.costoEstimado;
      e.gananciaReal=e.cobrado-e.costoProductos-e.parteLote-e.individuales;
      e.diferencia=e.gananciaReal-e.gananciaEstimada;
    });
    const meses=[...new Set(porEncargo.map(e=>e.mes))].sort();
    const porMes=meses.map(mes=>{
      const suyos=porEncargo.filter(e=>e.mes===mes),suma=k=>suyos.reduce((s,e)=>s+e[k],0);
      return {mes,encargos:suyos.length,cobrado:suma('cobrado'),costoProductos:suma('costoProductos'),costosEnvio:suma('parteLote')+suma('individuales'),gananciaReal:suma('gananciaReal'),gananciaEstimada:suma('gananciaEstimada')};
    });
    return {porEncargo,porLote,porMes};
  }
  function anticipoFarmasi(total,solicitado) {
    const t=centavos(total),a=solicitado===undefined?t:centavos(solicitado);
    exigir(t>0&&a===t,'El anticipo Farmasi debe ser el total del encargo.');return a/100;
  }
  /* Promoción Farmasi (D062, 2026-11-25): precio Sheepi en promoción, aparte del normal. Vacío → sin promoción.
   * Debe ser menor que el precio normal y no bajar del piso D062: la mitad del original + $2,50. */
  function precioPromoFarmasi(promo,{publico,precio}) {
    const t=String(promo??'').trim();if(t==='')return null;
    exigir(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(t),'Precio de promoción inválido.');
    const c=centavos(t),piso=Math.ceil(centavos(publico)/2)+250;
    exigir(c<centavos(precio),'La promoción ($'+t+') debe ser menor que el precio normal ($'+(centavos(precio)/100).toFixed(2)+').');
    exigir(c>=piso,'La promoción ($'+t+') baja del piso D062 ($'+(piso/100).toFixed(2)+').');
    return c/100;
  }
  /* Precio que se cobra: la promoción si existe y se usa el descuento del producto; con un descuento manual (admin), el calculado. */
  function precioFarmasiVigente({publico,promo,descuento,porDefecto}) {
    const normal=precioVentaFarmasi(publico,descuento);
    if(Number(descuento)!==Number(porDefecto))return normal;
    const p=precioPromoFarmasi(promo,{publico,precio:normal});
    return p===null?normal:p;
  }
  function validarFilaFarmasi(f,pct=20) {
    exigir(f.codigo_farmasi&&!/^[=+@-]/.test(f.codigo_farmasi),'Código Farmasi inválido.');
    exigir(f.linea&&f.producto,'Completa linea y producto.');
    exigir(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(f.precio_publico)&&centavos(f.precio_publico)>0,'Precio público inválido.');
    exigir(['Sí','No'].includes(f.pesado),'Pesado debe ser Sí o No.');
    exigir(['Sí','Agotado'].includes(f.disponible),'Disponible debe ser Sí o Agotado.');
    exigir(!f.color||/^#[0-9a-fA-F]{6}$/.test(f.color),'Color debe ser #RRGGBB o vacío.');
    exigir(!f.foto||/^fotos\/[^/\\]+$/.test(f.foto),'Foto debe ser fotos/<archivo>.');
    const descuento=porcentajeFarmasi(f.descuento,pct),precio=precioVentaFarmasi(f.precio_publico,descuento);
    if(f.precio_sheepi!==undefined&&String(f.precio_sheepi).trim()!=='') exigir(centavos(f.precio_sheepi)===centavos(precio),'El precio_sheepi del CSV ('+f.precio_sheepi+') no coincide con D060/D061 ('+precio.toFixed(2)+').');
    const promo=precioPromoFarmasi(f.precio_sheepi_promo,{publico:f.precio_publico,precio});
    return {...f,color:f.color||'',descuento,precio,promo};
  }
  function esFarmasi(x) {
    return x.recargo_traida!==undefined&&x.recargo_traida!==null&&x.recargo_traida!=='' ||
      (x.linea??x['Línea'])==='Salud y belleza'&&esEncargo({modalidad:x.modalidad??x.Modalidad});
  }
  function zonasFarmasi(valor) {
    if(Array.isArray(valor)) return valor.map(z=>{exigir(typeof z.nombre==='string'&&z.nombre.trim(),'La zona no es válida.');return {nombre:z.nombre,monto:z.monto===null?null:centavos(z.monto)/100};});
    const zonas=String(valor??'Retiro en casa:0;Ciudad de Panamá:5;Afueras:;Interior:').split(';').filter(Boolean).map(s=>{
      const i=s.lastIndexOf(':');exigir(i>0,'La configuración de zonas no es válida.');
      const nombre=s.slice(0,i).trim(),m=s.slice(i+1).trim();exigir(nombre,'La zona no es válida.');
      return {nombre,monto:m===''?null:centavos(m)/100};
    });
    exigir(new Set(zonas.map(z=>z.nombre)).size===zonas.length,'Hay zonas repetidas.');return zonas;
  }
  function cargosFarmasi({items,opcion,zona,config={}}) {
    exigir(Array.isArray(items),'Los productos no son válidos.');
    const propios=items.filter(esFarmasi),importe=(k,d)=>centavos(config[k]??d);
    const productos=propios.reduce((s,x)=>s+centavos(x.precio??x['Precio aprobado ($)'])*validarCantidad(x.cantidad??1),0);
    exigir(productos<=10000000,'El total de productos Farmasi supera $100000.');
    if(!propios.length)return {productos:0,traida:0,entrega:0,gestion:0,total:0,disponible:true,aviso:''};
    exigir(['Mi casillero','Entrega Sheepi'].includes(opcion),'Elige Mi casillero o Entrega Sheepi.');
    if(opcion==='Mi casillero')return {productos:productos/100,traida:0,entrega:0,gestion:0,total:productos/100,disponible:true,aviso:'El envío de Farmasi y el flete a Panamá se confirman al cotizar; pagas el flete a tu courier.'};
    const elegida=zonasFarmasi(config.ENTREGA_ZONAS_FARMASI??config.zonas).find(z=>z.nombre===zona);
    const disponible=!!elegida&&elegida.monto!==null,entrega=disponible?centavos(elegida.monto):0;
    const extra=propios.reduce((s,x)=>s+(x.recargo_traida!==undefined&&x.recargo_traida!==''?centavos(x.recargo_traida):(x.Pesado==='Sí'?importe('TRAIDA_PESADO',3):0))*validarCantidad(x.cantidad??1),0);
    const traida=productos>=importe('TRAIDA_GRATIS_DESDE',75)?0:importe('TRAIDA_FIJA',5)+extra,gestion=importe('CARGO_GESTION',0);
    exigir(productos+traida+entrega+gestion<=10000000,'El total Farmasi supera $100000.');
    return {productos:productos/100,traida:traida/100,entrega:entrega/100,gestion:gestion/100,total:(productos+traida+entrega+gestion)/100,disponible,aviso:disponible?'':'No disponible por ahora. Escríbenos para coordinar.'};
  }
  raiz.logica={precioPromoFarmasi,precioFarmasiVigente,repartirPorValor,costosVigentes,conciliacionFarmasi,redondeoVenta,porcentajeFarmasi,precioVentaFarmasi,nombreCorto,validarNombre,anticipoFarmasi,validarFilaFarmasi,precioSheepi,esFarmasi,zonasFarmasi,cargosFarmasi,esEncargo,limiteBolsa,refrescarBolsa,tallaCorta,siguienteCodigo,totalBolsa,prorratear,validarVenta,validarPrenda,mensajeWhatsApp,mensajeCobro,esObservacionPublica,idFoto,centavos,fecha,exigir,dinero,esCodigo,lineaDeCodigo,validarMonto,validarCantidad,validarAcuerdo,parteDueno,repartirReversion,repartirReembolso,sumaPago,saldos,anticiposSinAplicar,TRANSICIONES_ENCARGO,transicionEncargo,cierreCancelacion,estadoConsignacion,consignacionesPorVencer,mensajeEstadoCuenta,mensajeVentaDueno,mensajeCotizacion};
  raiz.logica.descuentoFarmasi=descuentoFarmasi;
  if(typeof module!=='undefined') module.exports=raiz.logica;
})(globalThis);
