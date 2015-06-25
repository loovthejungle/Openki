Router.map(function() {
	this.route('userprofile', {
		path: 'user/:_id/:username?',
		waitOn: function () {
			return [
				Meteor.subscribe('user', this.params._id),
				Meteor.subscribe('groupsFind', { own: true }),
				Meteor.subscribe('coursesFind', 'all', false, { userInvolved: this.params._id })
			];
		},
		data: function () {
			var user = Meteor.users.findOne({_id: this.params._id});
			if (!user) return; // not loaded?

			// What privileges the user has
			var privileges = _.reduce(['admin', 'upload'], function(ps, p) {
				ps[p] = privileged(user, p);
				return ps;
			}, {});

			var alterPrivileges = privilegedTo('admin');
			var showPrivileges = alterPrivileges || (user.privileges && user.privileges.length);

			return {
				'user': user,
				'involvedIn': coursesFind('all', false, { userInvolved: this.params._id }),
				'alterPrivileges': alterPrivileges,
				'privileges': privileges,
				'inviteGroups': groupsFind({ own: true }),
				'showPrivileges': showPrivileges
			};
		},
		onAfterAction: function() {
			var user = Meteor.users.findOne({_id: this.params._id})
			if (!user) return; // wtf
			document.title = webpagename + '' + user.username + "'s Profile"
		}
	})
})


Template.userprofile.helpers({
	// whether userprofile is for the logged-in user
	ownuser: function () {
		return this.user && this.user._id === Meteor.userId()
	},
	
	groupMember: function(group, user) {
		return user && group && group.members && group.members.indexOf(user._id) >= 0;
	}
})


Template.userprofile.events({
	'click button.giveAdmin': function() {
		Meteor.call('addPrivilege', this.user._id, 'admin', function(err) {
			if (err) {
				addMessage(mf('privilege.errorAdding', { ERROR: err }, 'Unable to add privilege: {ERROR}'), 'danger');
			} else {
				addMessage(mf('privilege.addedAdmin', 'Granted admin privilege'), 'sucess');
			}
		});
	},
	
	'click button.giveUpload': function() {
		Meteor.call('addPrivilege', this.user._id, 'upload', function(err) {
			if (err) {
				addMessage(mf('privilege.errorAdding', { ERROR: err }, 'Unable to add privilege: {ERROR}'), 'danger');
			} else {
				addMessage(mf('privilege.addedUpload', 'Granted upload privilege'), 'success');
			}
		});
	},
	
	'click button.remove': function(event, template) {
		var priv = template.$(event.target).data('priv')
		Meteor.call('removePrivilege', this.user._id, priv, function(err) {
			if (err) {
				addMessage(mf('privilege.errorRemoving', { ERROR: err }, 'Unable to remove privilege: {ERROR}'), 'danger');
			} else {
				addMessage(mf('privilege.removed', 'Removed privilege'), 'success');
			}
		});
	},

	'click button.sendmail': function () {
		var send_user = Meteor.user()
		if(send_user) {
			var send_userdata = {id:Meteor.userId(),username:Meteor.user().username}
			if(send_user.emails) {
				send_userdata.email = send_user.emails[0].address
			}
			var rec_user_id = this.user._id
			var rec_user = Meteor.users.findOne({_id:rec_user_id});
			if(rec_user){
				if(rec_user.username){
					var rec_user = rec_user.username;
				}
			}
			var messageInput = document.getElementById('emailmessage').value;
			if ($('#sendOwnAdress').is(':checked')){
				var ownMail = '\n  his/hers direct contact is: '+send_userdata.email
			};
			var receiveCopy = $('#receiveCopy').is(':checked');
			var message = 'hello '+rec_user+',\n'+send_userdata.username+' sends you the following message:\n"'+messageInput+'"'+(ownMail?ownMail:'')+'\n\ncheers!';

			if (messageInput.length >= '7'){
				Meteor.call('sendEmail',
				rec_user_id,
				'from',
				'Privat-message from '+send_userdata.username,
				message,
				function(error, result){
					if (error) addMessage(error, 'danger')
				}
				);
				if (receiveCopy){
					Meteor.call('sendEmail',
					send_user._id,
					'from',
					'Copy of your Privat-message to '+rec_user,
					message);
				//todo: reset clear the form.
				addMessage(mf('email.sent', 'email could have been sent'), 'success');

				}

			}
			else {alert ('longer text please')}
		}
		else {alert ('login...')}
	},
	
	'click button.draftIntoGroup': function(event, template) {
		var groupId = this._id;
		var name = this.name;
		var userId = Template.parentData().user._id;
		Meteor.call('updateGroupMembership', userId, groupId, true, function(err) {
			if (err) {
				addMessage(mf('profile.group.draftError', { ERROR: err }, 'Unable draft user into group: {ERROR}'), 'danger');
			} else {
				addMessage(mf('profile.group.drafted', { NAME: name }, 'Added to group {NAME}'), 'success');
			}
		});
	},
	
	'click button.expelFromGroup': function(event, template) {
		var groupId = this._id;
		var name = this.name;
		var userId = Template.parentData().user._id;
		Meteor.call('updateGroupMembership', userId, groupId, false, function(err) {
			if (err) {
				addMessage(mf('profile.group.expelError', { ERROR: err }, 'Unable expel user from group: {ERROR}'), 'danger');
			} else {
				addMessage(mf('profile.group.expelled', { NAME: name }, 'Expelled from group {NAME}'), 'success');
			}
		});
	},
})

Template.userprofile.rendered = function() {
    var currentPath = Router.current().route.path(this)
    $('a[href!="' + currentPath + '"].nav_link').removeClass('active');
    $('a.loginButton.nav_link').addClass('active');
}
