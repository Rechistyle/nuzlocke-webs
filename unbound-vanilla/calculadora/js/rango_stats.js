/* ============================================================================
   Botones Mín/Máx de Ataque, Defensa, At. Esp. y Def. Esp.

   Para un Pokémon salvaje del que no se conocen los IVs ni la naturaleza: cada
   botón fija los IVs y la naturaleza que dan el stat más alto o más bajo
   posible (los EVs no se tocan), de modo que se ven de un vistazo los
   resultados extremos del cálculo.

     Máx = IV 31 y naturaleza que sube ese stat y baja su pareja
     Mín = IV 0  y naturaleza que baja ese stat y sube su pareja

   Parejas: Ataque con At. Esp., y Defensa con Def. Esp. Las dos defensas
   fijan también el IV de PS, porque el daño recibido depende de él.
   ============================================================================ */
(function () {
	var NAT = { 'at,sa': 'Adamant', 'sa,at': 'Modest', 'df,sd': 'Lax', 'sd,df': 'Gentle' };   // 'sube,baja'
	var PAREJA = { at: 'sa', sa: 'at', df: 'sd', sd: 'df' };
	var DEFENSAS = { df: 1, sd: 1 };

	function objetivo(st, max) {
		return {
			iv: max ? 31 : 0,
			nat: max ? NAT[st + ',' + PAREJA[st]] : NAT[PAREJA[st] + ',' + st],
			conPS: !!DEFENSAS[st],
		};
	}

	function aplica(poke, st, max) {
		var o = objetivo(st, max);
		poke.find('.' + st + ' .ivs').val(o.iv);
		if (o.conPS) poke.find('.hp .ivs').val(o.iv);
		poke.find('.nature').val(o.nat);
		// que se recalculen los stats y el daño, como si se hubiera tecleado
		if (o.conPS) poke.find('.hp .ivs').trigger('change');
		poke.find('.' + st + ' .ivs').trigger('change');
		poke.find('.nature').trigger('change');
	}

	// marca los botones cuyo estado coincide con lo que hay en pantalla
	function refresca(poke) {
		var nat = poke.find('.nature').val();
		poke.find('button.rango').each(function () {
			var b = $(this), st = b.data('stat'), o = objetivo(st, b.data('ext') === 'max');
			var ok = nat === o.nat && ~~poke.find('.' + st + ' .ivs').val() === o.iv &&
				(!o.conPS || ~~poke.find('.hp .ivs').val() === o.iv);
			b.toggleClass('activo', ok);
		});
	}

	$(document).on('click', 'button.rango', function () {
		var poke = $(this).closest('.poke-info');
		aplica(poke, $(this).data('stat'), $(this).data('ext') === 'max');
		refresca(poke);
	});
	$(document).on('change keyup', '.poke-info .ivs, .poke-info .nature', function () {
		refresca($(this).closest('.poke-info'));
	});
	// al cargar un set (o un entrenador) cambian IVs y naturaleza sin tocar esos campos
	$(document).on('change', '.set-selector', function () {
		setTimeout(function () { $('.poke-info').each(function () { refresca($(this)); }); }, 0);
	});
	$(function () { $('.poke-info').each(function () { refresca($(this)); }); });
})();
