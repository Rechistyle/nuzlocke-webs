/* ============================================================================
   Habilidades y objetos propios de un hackrom (los declara el generador en
   JUEGO_DATOS.habilidadesNuevas y JUEGO_DATOS.objetosNuevos).

   Hay dos formas de dar comportamiento a una habilidad u objeto nuevo:

   1. Alias ("Base: Sand Force"): se comporta EXACTAMENTE como la oficial. Se
      resuelve en hasAbility()/hasItem(), que es por donde el motor lee todas
      las habilidades y objetos, así que vale en cualquier generación.

   2. Efectos ("Calculo: potencia | x2 | clima=Sand; tipo=Rock"): multiplicadores
      que se suman a los cuatro que ya reúne el motor (potencia, ataque, defensa
      y daño final), en 4096avos como los suyos. Solo en generación 5 o superior.
      Se enganchan en las llamadas a chainMods de gen56.js y gen789.js.

   Este archivo no depende del motor: funciona en el navegador (variables
   globales) y en Node (module.exports), para poder probarlo.
   ============================================================================ */

function nztDatos() { return (typeof JUEGO_DATOS !== 'undefined' && JUEGO_DATOS) || {}; }

function nztHabBase(nombre) {
	var h = (nztDatos().habilidadesNuevas || {})[nombre];
	return h && h.alias ? h.alias : nombre;
}
function nztObjBase(nombre) {
	var o = (nztDatos().objetosNuevos || {})[nombre];
	return o && o.alias ? o.alias : nombre;
}

var NZT_CLIMA = { Sun: ['Sun', 'Harsh Sunshine'], Rain: ['Rain', 'Heavy Rain'], Sand: ['Sand'], Hail: ['Hail'], Snow: ['Snow'] };
var NZT_ESTADO = { Burn: ['brn'], Poison: ['psn', 'tox'], Paralysis: ['par'], Sleep: ['slp'], Freeze: ['frz'] };

function nztBandera(f, move) {
	if (f === 'secondary') return !!((move.secondaries || move.named('Jet Punch', 'Order Up')) && !move.isMax);
	if (f === 'recoil') return !!(move.recoil || move.hasCrashDamage);
	return !!(move.flags && move.flags[f]);
}

function nztCumple(c, o, otro, move, field, ctx, etapa) {
	var i;
	if (c.clima) {
		var ws = [];
		for (i = 0; i < c.clima.length; i++) ws = ws.concat(NZT_CLIMA[c.clima[i]] || [c.clima[i]]);
		if (!field.hasWeather.apply(field, ws)) return false;
	}
	if (c.terreno && !field.hasTerrain.apply(field, c.terreno)) return false;
	if (c.tipo && !move.hasType.apply(move, c.tipo)) return false;
	if (c.categoria) {
		var fisico = etapa === 'defensa' && ctx.hitsPhysical !== undefined ? ctx.hitsPhysical : move.category === 'Physical';
		if ((c.categoria === 'Physical') !== !!fisico) return false;
	}
	if (c.movimiento) {
		var alguno = false;
		for (i = 0; i < c.movimiento.length; i++) if (nztBandera(c.movimiento[i], move)) alguno = true;
		if (!alguno) return false;
	}
	var bp = ctx.basePower != null ? ctx.basePower : move.bp;
	if (c.potenciaMax != null && !(bp <= c.potenciaMax)) return false;
	if (c.potenciaMin != null && !(bp >= c.potenciaMin)) return false;
	if (c.estado) {
		if (!o.status) return false;
		if (c.estado.indexOf('Any') < 0) {
			var codigos = [];
			for (i = 0; i < c.estado.length; i++) codigos = codigos.concat(NZT_ESTADO[c.estado[i]] || []);
			if (codigos.indexOf(o.status) < 0) return false;
		}
	}
	if (c.psMax && !(o.curHP() * c.psMax[1] <= o.maxHP() * c.psMax[0])) return false;
	if (c.psLleno) {
		// igual que el motor con Multiscale: PS completos y sin que los hazards se los quiten
		var lado = ctx.defensor === o ? field.defenderSide : field.attackerSide;
		if (o.curHP() !== o.maxHP()) return false;
		if (lado.isSR || (lado.spikes && !o.hasType('Flying'))) return false;
	}
	if (c.efectividad) {
		if (ctx.typeEffectiveness == null) return false;
		if (c.efectividad === 'super' ? !(ctx.typeEffectiveness > 1) : !(ctx.typeEffectiveness < 1)) return false;
	}
	if (c.critico && !ctx.isCritical) return false;
	return true;
}

/* Devuelve la lista de multiplicadores del motor con los efectos propios añadidos.
   etapa: potencia | ataque | defensa | dano. El dueño del efecto es el atacante o
   el defensor según "rol" (por defecto, el atacante, salvo en la etapa defensa). */
function nztMods(lista, etapa, atacante, defensor, move, field, ctx, desc) {
	var D = nztDatos();
	if (!D.habilidadesNuevas && !D.objetosNuevos) return lista;
	ctx = ctx || {};
	ctx.defensor = defensor;
	var extra = [];
	var duenos = [['atacante', atacante, defensor, 'attacker'], ['defensor', defensor, atacante, 'defender']];
	duenos.forEach(function (d) {
		var rol = d[0], o = d[1], otro = d[2], lado = d[3];
		[[D.habilidadesNuevas, o.ability, 'Ability'], [D.objetosNuevos, o.item, 'Item']].forEach(function (t) {
			var def = t[0] && t[1] && t[0][t[1]];
			if (!def || !def.efectos) return;
			def.efectos.forEach(function (e) {
				if (e.etapa !== etapa) return;
				if ((e.rol || (etapa === 'defensa' ? 'defensor' : 'atacante')) !== rol) return;
				if (!nztCumple(e.cond || {}, o, otro, move, field, ctx, etapa)) return;
				extra.push(Math.round(e.factor * 4096));
				if (desc) desc[lado + t[2]] = t[1];
			});
		});
	});
	return extra.length ? lista.concat(extra) : lista;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { nztMods: nztMods, nztHabBase: nztHabBase, nztObjBase: nztObjBase };
}
