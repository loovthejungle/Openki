Template.groupSettings.onCreated(function() {
	var instance = this;
	instance.userSearch = new ReactiveVar('');

	instance.autorun(function() {
		var search = instance.userSearch.get();
		if (search.length > 0) {
			Meteor.subscribe('userSearch', search);
		}
	});
});

Template.groupSettings.helpers({
	foundUsers: function() {
		var instance = Template.instance();

		var search = instance.userSearch.get();
		if (search === '') return false;

		var group = Groups.findOne(Router.current().params._id);
		return UserLib.searchPrefix(search, { exclude: group.members, limit: 30 });
	},

	kioskEventURL: function() {
		return Router.routes.kioskEvents.url({}, { query: {group: this._id} });
	},
	timetableURL: function() {
		return Router.routes.timetable.url({}, { query: {group: this._id} });
	},
	scheduleURL: function() {
	return Router.routes.frameSchedule.url({}, { query: {group: this._id} });
	},
	frameEventsURL: function() {
		return Router.routes.frameEvents.url({}, { query: {group: this._id} });
	},
	frameCalendarURL: function() {
		return Router.routes.frameCalendar.url({}, { query: {group: this._id} });
	},
	frameListURL: function() {
		return Router.routes.frameList.url({}, { query: {group: this._id} });
	},
});

Template.groupSettings.events({
	'keyup .-userSearch': function(event, instance) {
		instance.userSearch.set(instance.$('.-userSearch').val());
	},

	'click .js-member-add-btn': function(event, instance) {
		var memberId = this._id;
		var groupId = Router.current().params._id;
		Meteor.call("updateGroupMembership", memberId, groupId, true, function(err) {
			if (err) {
				showServerError('Could not add member', err);
			} else {
				addMessage(mf('group.settings.addedMember', "Added group member"), 'success');
			}
		});
	},

	'click .js-member-remove-btn': function(event, instance) {
		var memberId = ''+this;
		var groupId = Router.current().params._id;
		Meteor.call("updateGroupMembership", memberId, groupId, false, function(err) {
			if (err) {
				showServerError('Could not remove member', err);
			} else {
				addMessage(mf('group.settings.removedMember', "Removed group member"), 'success');
			}
		});
	},

	'click .js-group-edit-save': function(event, instance) {
		Meteor.call("saveGroup", instance.data.group._id, {
			logoUrl: instance.$('.-logoUrl').val(),
			backgroundUrl: instance.$('.-backgroundUrl').val(),
		}, function(err) {
			if (err) {
				showServerError('Could not save settings', err);
			} else {
				addMessage(mf('group.settings.saved', "Saved settings"), 'success');
				instance.parentInstance().editingSettings.set(false);
			}
		});
	},

	'click .js-group-edit-cancel': function(event, instance) {
		instance.parentInstance().editingSettings.set(false);
	}
});
