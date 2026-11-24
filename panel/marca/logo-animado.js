/* Arma el logo de Sheepi por capas dentro de cada .logo-anim.
   Las capas salen del logo de Nicole (nicole/logo-sheepi-vino.png) separado por piezas;
   posiciones en % del lienzo original (655 x 539). Ver logo-capas/posiciones.json. */
(function(){
  var CAPAS = [
    ['cara',    4.427,  0,      86.412, 60.297, 'cara'],
    ['ojo-izq', 31.756, 38.776, 4.427,  7.236,  'ojo ojo-izq'],
    ['ojo-der', 57.405, 38.776, 4.275,  6.865,  'ojo ojo-der'],
    ['s',       0,      64.75,  14.046, 24.119, 'letra', 0],
    ['h',       16.489, 55.102, 16.794, 31.54,  'letra', 1],
    ['e1',      35.725, 65.677, 15.42,  21.707, 'letra', 2],
    ['e2',      53.588, 65.677, 15.42,  21.707, 'letra', 3],
    ['p',       71.45,  69.017, 16.183, 30.983, 'letra', 4],
    ['i',       90.076, 69.202, 5.344,  18.182, 'letra', 5],
    ['flor',    87.634, 55.102, 12.366, 13.729, 'letra flor', 5]
  ];
  function montar(el){
    if (el.dataset.montado) return;
    var base = el.dataset.base || 'logo-capas/';
    CAPAS.forEach(function(c){
      var img = document.createElement('img');
      img.src = base + c[0] + '.png'; img.alt = '';
      img.className = c[5];
      img.style.cssText = 'left:'+c[1]+'%;top:'+c[2]+'%;width:'+c[3]+'%;height:'+c[4]+'%';
      if (c[6] !== undefined) img.style.setProperty('--i', c[6]);
      el.appendChild(img);
    });
    el.setAttribute('role','img');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label','Sheepi');
    el.dataset.montado = '1';
  }
  /* Reinicia una clase de animación (para repetir entradas) */
  function animar(el, clase){
    el.classList.remove('entra-der','entra-izq','sale-izq','sale-der','ola','aparece');
    void el.offsetWidth;
    if (clase) el.classList.add(clase);
  }
  window.SheepiLogo = { montar: montar, animar: animar };
  document.querySelectorAll('.logo-anim').forEach(montar);
})();
