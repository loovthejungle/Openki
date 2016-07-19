Router.map(function () {
	this.route('frameSchedule', {
		path: '/frame/schedule',
		layoutTemplate: 'frameLayout',
	});
});

Template.frameSchedule.onCreated(function() {
	var filter = Filtering(EventPredicates);

	var instance = this;
	instance.interval = new ReactiveVar(60);
	instance.scheduleStart = new ReactiveVar(moment());
	instance.separators = new ReactiveVar([]);

	this.autorun(function() {
		var query = Router.current().params.query;

		var scheduleStart;
		if (query.start) scheduleStart = moment(query.start);
		if (!scheduleStart || !scheduleStart.isValid()) scheduleStart = moment(minuteTime.get()).startOf('week');
		instance.scheduleStart.set(scheduleStart);


		var rawSeps = (query.sep || "").split(',');
		var seps = [];
		_.each(rawSeps, function(rawSep) {
			if (rawSep.length == 0) {
				return;
			}

			if (rawSep.length < 3) {
				rawSep = rawSep + "00";
			}

			var hm = parseInt(rawSep, 10);
			if (!isNaN(hm)) {
				var h = Math.floor(hm/100);
				var m = hm % 100;
				seps.push(h*60+m);
			}
		});
		var separators = _.uniq(seps);
		instance.separators.set(separators);

		var readInterval = parseInt(query.interval, 10);
		if (!isNaN(readInterval) && readInterval > 0) {
			instance.interval.set(readInterval);
		} else {
			if (separators.length > 0) {
				instance.interval.set(24*60);
			} else {
				instance.interval.set(60);
			}
		}


		filter.clear().read(query);
		filter.add('after', scheduleStart);
		filter.add('end', moment(scheduleStart).add(1, 'week'));
		filter.done();
	});

	this.autorun(function() {
		subs.subscribe('eventsFind', filter.toQuery(), 100);
	});


	instance.days = new ReactiveVar([]);
	instance.intervals = new ReactiveVar([]);
	instance.slots = new ReactiveVar({});

	this.autorun(function() {
		var scheduleStart = moment(filter.get('after'));
		var end = moment(filter.get('end'));
		var dayCount = end.diff(scheduleStart, 'days');
		var interval = instance.interval.get();

		// Because we need to find the closest separator later on
		// we create a reversed copy which is easier to search
		var separators = instance.separators.get().slice().reverse();

		// List of intervals where events or separators are placed
		var intervals = _.reduce(separators, function(intervals, separator) {
			intervals[separator] = separator;
			return intervals;
		}, {});

		// List of days where events where found
		var days = {};

		// Map of slots where events were found. each slot holds a list of events.
		var slots = {};

		// Place found events into the slots
		eventsFind(filter.toQuery(), 100).forEach(function(event) {
			var eventStart = moment(event.start);
			var dayStart = moment(eventStart).startOf('day');

			var day = dayStart.diff(scheduleStart, 'days');
			days[day] = day;

			var minuteDiff = eventStart.diff(dayStart, 'minutes');
			var intervalStart = Math.floor(minuteDiff / interval) * interval;
			var closestSeparator = _.find(separators, function(sep) {
				return sep < minuteDiff;
			});

			var mins = Math.max(intervalStart, closestSeparator || 0);
			intervals[mins] = mins;

			if (!slots[mins]) slots[mins] = [];
			if (!slots[mins][day]) slots[mins][day] = [];
			slots[mins][day].push(event);
		});

		var numCmp = function(a, b) { return a - b; };
		instance.days.set(_.values(days).sort(numCmp));
		instance.intervals.set(_.values(intervals).sort(numCmp));
		instance.slots.set(slots);
	});
});

Template.frameSchedule.helpers({
	days: function() {
		var instance = Template.instance();
		var scheduleStart = instance.scheduleStart.get();
		return _.map(Template.instance().days.get(), function(day) {
			return moment(scheduleStart).add(day, 'days').format('dddd');
		});
	},

	intervals: function() {
		var slots = Template.instance().slots.get();

		return _.map(Template.instance().intervals.get(), function(mins) {
			return {
				interval: moment().hour(0).minute(mins).format('LT'),
				slots: _.map(Template.instance().days.get(), function(day) {
					return slots[mins] && slots[mins][day];
				})
			}
		});
	},
});