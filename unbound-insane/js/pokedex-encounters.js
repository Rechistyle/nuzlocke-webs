
var PokedexEncountersPanel = PokedexResultPanel.extend({
	initialize: function(id) {
		id = toID(id);
		// una zona desconocida no debe romper la aplicación entera
		var location = BattleLocationdex[id] || { name: id, land: {}, surf: {}, rock: {}, fish: {} };
		this.id = id;
		this.shortTitle = location.name || id;

		var buf = '<div class="pfx-body dexentry">';

		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/encounters/'+id+'" data-target="push" class="subtle">'+location.name+'</a></h1>';

		// distribution
		buf += '<ul class="utilichart metricchart nokbd">';
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderDistribution.bind(this));
	},
	getDistribution: function() {
		if (this.results) return this.results;

        var landRates = BattleLocationdex['rates']['land']
        var surfRates = BattleLocationdex['rates']['surf']
        var rockRates = BattleLocationdex['rates']['rock']
        var oldRodRates = BattleLocationdex['rates']['fish']['old']
        var goodRodRates = BattleLocationdex['rates']['fish']['good']
        var superRodRates = BattleLocationdex['rates']['fish']['super']

		var location = this.id;
		var results = [];
		var formatRate = function(i) { return i.toString().padStart(3, 'z') + '% '; };
		var formatRange = function(min, max) { return min.toString().padStart(3, '0') + '-' + max.toString().padStart(3, '0') + ' '; };
		var loc = BattleLocationdex[location] || {};
		var LETRA = {'Morning':'M','Day':'D','Night':'N','Poké Radar':'P','Honey Tree':'H','Surf':'W','Old Rod':'O','Good Rod':'G','Super Rod':'S'};
		['land','surf','rock','fish'].forEach(function(bucket){
			var b = loc[bucket]; if (!b || !b.encs) return;
			for (var i=0;i<b.encs.length;i++){
				var enc = b.encs[i];
				var rate = (enc.rate !== undefined) ? enc.rate : (BattleLocationdex['rates'][bucket]||[])[i];
				var letra = LETRA[enc.label] || 'B';
				results.push(letra + formatRate(rate||0) + formatRange(enc.minLvl, enc.maxLvl) + enc.species);
			}
		});
		results.sort();

		var last = '';
		for (var i=0; i<results.length; i++) {
			if (results[i].charAt(0) !== last) {
				results.splice(i, 0, results[i].charAt(0).toUpperCase());
				i++;
			}
			last = results[i].charAt(0);
		}
		return this.results = results;
	},
	renderDistribution: function() {
		var results = this.getDistribution();
		this.$chart = this.$('.utilichart');

		if (results.length > 1600/33) {
			this.streamLoading = true;
			this.$el.on('scroll', this.handleScroll.bind(this));

			var panelTop = this.$el.children().offset().top;
			var panelHeight = this.$el.outerHeight();
			var chartTop = this.$chart.offset().top;
			var scrollLoc = this.scrollLoc = this.$el.scrollTop();

			var start = Math.floor((scrollLoc - (chartTop-panelTop)) / 33 - 35);
			var end = Math.floor(start + 35 + panelHeight / 33 + 35);
			if (start < 0) start = 0;
			if (end > results.length-1) end = results.length-1;
			this.start = start, this.end = end;

			// distribution
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i, i < start || i > end)+'</li>';
			}
			this.$chart.html(buf);
		} else {
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i)+'</li>';
			}
			this.$chart.html(buf);
		}
	},
	renderRow: function(i, offscreen) {
		var results = this.results;
		var id = results[i].substr(14);
		var template = id ? BattlePokedex[id] : undefined;
		if (!template) {
			switch (results[i].charAt(0)) {
			case 'L':
				return '<h3>Land</h3>';
			case 'M':
				return '<h3>Hierba - Mañana</h3>';
			case 'D':
				return '<h3>Hierba - Día</h3>';
			case 'N':
				return '<h3>Hierba - Noche</h3>';
			case 'P':
				return '<h3>Poké Radar</h3>';
			case 'H':
				return '<h3>Honey Tree</h3>';
			case 'W':
				return '<h3>Surfing</h3>';
			case 'R':
				return '<h3>Rock Smash</h3>';
            case 'O':
				return '<h3>Old Rod</h3>';
            case 'G':
				return '<h3>Good Rod</h3>';
            case 'S':
				return '<h3>Super Rod</h3>';
			}
			return '<pre>error: "'+results[i]+'"</pre>';
		} else if (offscreen) {
			return ''+template.name+' '+template.abilities['0']+' '+(template.abilities['1']||'')+' '+(template.abilities['H']||'')+'';
		} else {
			var desc = results[i].substr(1,3).replace("z", "")
			return BattleSearch.renderTaggedLocationRowInner(template, desc);
		}
	},
	handleScroll: function() {
		var scrollLoc = this.$el.scrollTop();
		if (Math.abs(scrollLoc - this.scrollLoc) > 20*33) {
			this.renderUpdateDistribution();
		}
	},
	debouncedPurgeTimer: null,
	renderUpdateDistribution: function(fullUpdate) {
		if (this.debouncedPurgeTimer) {
			clearTimeout(this.debouncedPurgeTimer);
			this.debouncedPurgeTimer = null;
		}

		var panelTop = this.$el.children().offset().top;
		var panelHeight = this.$el.outerHeight();
		var chartTop = this.$chart.offset().top;
		var scrollLoc = this.scrollLoc = this.$el.scrollTop();

		var results = this.results;

		var rowFit = Math.floor(panelHeight / 33);

		var start = Math.floor((scrollLoc - (chartTop-panelTop)) / 33 - 35);
		var end = start + 35 + rowFit + 35;
		if (start < 0) start = 0;
		if (end > results.length-1) end = results.length-1;

		var $rows = this.$chart.children();

		if (fullUpdate || start < this.start - rowFit - 30 || end > this.end + rowFit + 30) {
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i, (i < start || i > end))+'</li>';
			}
			this.$chart.html(buf);
			this.start = start, this.end = end;
			return;
		}

		if (start < this.start) {
			for (var i = start; i<this.start; i++) {
				$rows[i].innerHTML = this.renderRow(i);
			}
			this.start = start;
		}

		if (end > this.end) {
			for (var i = this.end+1; i<=end; i++) {
				$rows[i].innerHTML = this.renderRow(i);
			}
			this.end = end;
		}

		if (this.end - this.start > rowFit+90) {
			var self = this;
			this.debouncedPurgeTimer = setTimeout(function() {
				self.renderUpdateDistribution(true);
			}, 1000);
		}
	}
});
