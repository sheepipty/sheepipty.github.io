// GENERADO desde compartido/logica.js — no editar — sha256:4e3f7184aa36c1a8f1758df4823419c80ae1a539e0fcdf5b127598233c80be21
/* Fuente única de reglas puras: Apps Script, navegador y Node. */
(function (raiz) {
  'use strict';
  const exigir = (condicion, texto) => { if (!condicion) throw new Error(texto); };
  const centavos = valor => {
    exigir(valor !== '' && valor !== null && Number.isFinite(Number(valor)) && Number(valor) >= 0, 'Ingresa un monto válido, mayor o igual a cero.');
    return Math.round(Number(valor) * 100);
  };
  const dinero = valor => '$' + Number(valor).toFixed(2).replace(/\.00$/, '');
  function siguienteCodigo(codigos) {
    return 'NC-' + String(codigos.reduce((max, codigo) => {
      const m = /^NC-(\d{3,})$/.exec(codigo); return m ? Math.max(max, Number(m[1])) : max;
    }, 0) + 1).padStart(3, '0');
  }
  function totalBolsa(items, combos = {3:12, 5:18}) {
    exigir(Array.isArray(items), 'La bolsa no es válida.');
    exigir(new Set(items.map(x=>x.codigo)).size === items.length, 'Hay códigos repetidos en la bolsa.');
    items.forEach(x=>{exigir(/^NC-\d{3,}$/.test(x.codigo), 'Código de prenda inválido.'); centavos(x.precio);});
    const elegibles = items.filter(x=>x.combo === true).slice().sort((a,b)=>centavos(b.precio)-centavos(a.precio) || a.codigo.localeCompare(b.codigo));
    const otros = items.filter(x=>x.combo !== true);
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
    const subtotal=items.reduce((s,x)=>s+centavos(x.precio),0);
    const total=dp[elegibles.length].costo+otros.reduce((s,x)=>s+centavos(x.precio),0);
    return {subtotal:subtotal/100,total:total/100,descuento:(subtotal-total)/100,grupos};
  }
  function prorratear(grupos) {
    return grupos.flatMap(g=>{
      const base=g.items.reduce((s,x)=>s+centavos(x.precio),0), objetivo=centavos(g.total);
      const partes=g.items.map(x=>({codigo:x.codigo,precio:x.precio,centavos:base?Math.round(objetivo*centavos(x.precio)/base):0}));
      const cara=partes.reduce((a,b)=>Number(b.precio)>Number(a.precio)?b:a);
      cara.centavos+=objetivo-partes.reduce((s,x)=>s+x.centavos,0);
      return partes.map(x=>({codigo:x.codigo,monto:x.centavos/100}));
    });
  }
  function validarVenta(d) {
    exigir(Array.isArray(d.codigos) && d.codigos.length>0 && d.codigos.length<=30, 'Elige entre 1 y 30 prendas.');
    exigir(new Set(d.codigos).size===d.codigos.length, 'Hay códigos repetidos.');
    d.codigos.forEach(c=>exigir(/^NC-\d{3,}$/.test(c),'Código inválido.'));
    exigir(['Yappy','Transferencia BAC','Efectivo','Otro'].includes(d.medio), 'Elige un medio de pago válido.');
    exigir(d.medio==='Efectivo'||String(d.referencia||'').trim(), 'Ingresa la referencia del pago.');
    exigir(['Delivery','Retiro'].includes(d.entrega), 'Elige Delivery o Retiro.');
    exigir(['WhatsApp','Instagram','Facebook','En persona','Otro'].includes(d.canal), 'Elige el canal de venta.');
    centavos(d.envio ?? 0);
    exigir(d.entrega!=='Retiro'||centavos(d.envio ?? 0)===0,'El retiro no lleva envío cobrado.');
    fecha(d.fecha); return d;
  }
  function fecha(valor) {
    exigir(/^\d{4}-\d{2}-\d{2}$/.test(valor||'') && new Date(valor+'T12:00:00Z').toISOString().slice(0,10)===valor,'Ingresa una fecha válida (AAAA-MM-DD).'); return valor;
  }
  function validarPrenda(d) {
    ['Categoría','Descripción','Talla','Estado físico'].forEach(k=>exigir(String(d[k]||'').trim(),'Completa '+k+'.'));
    exigir(['Excelente','Bueno','Regular'].includes(d['Estado físico']),'El estado físico no es válido.');
    centavos(d['Precio aprobado ($)']); return d;
  }
  function mensajeWhatsApp(items, entrega, marca, combos={3:12,5:18}) {
    const t=totalBolsa(items,combos);
    return 'Hola, me interesan estas prendas de '+marca+':\n'+items.map(x=>'• '+x.codigo+' '+x.descripcion+' ('+x.talla+') '+dinero(x.precio)).join('\n')+
      '\nSubtotal '+dinero(t.subtotal)+' · Total '+dinero(t.total)+'\nEntrega: '+entrega+'\n¿Me confirmas disponibilidad '+(entrega==='Retiro'?'para coordinar el retiro?':'y el costo del envío?');
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
  raiz.logica={tallaCorta,siguienteCodigo,totalBolsa,prorratear,validarVenta,validarPrenda,mensajeWhatsApp,mensajeCobro,esObservacionPublica,idFoto,centavos,fecha,exigir};
  if(typeof module!=='undefined') module.exports=raiz.logica;
})(globalThis);
