/*global define */

define(['jquery', 'underscore', 'backbone', 'views/SignInView', 'text!templates/navbar.html'],
	function($, _, Backbone, SignInView, NavbarTemplate) {
	'use strict';

	// Build the navbar view of the application
	var NavbarView = Backbone.View.extend({

		el: '#Navbar',

		template: _.template(NavbarTemplate),

		events: {
						  'click #search_btn' : 'triggerSearch',
					   'keypress #search_txt' : 'triggerOnEnter',
			         'click .show-new-search' : 'resetSearch',
			         'click .show-new-editor' : 'resetEditor',
			 		 'click .dropdown-menu a' : 'hideDropdown',
			 		 	    'click .dropdown' : 'hideDropdown',
			 		 	'mouseover .dropdown' : 'showDropdown',
			 		 	 'mouseout .dropdown' : 'hideDropdown',
			 		 	'click #nav-trigger'  : 'showNav',
			 		 		  'click .nav li' : 'showSubNav'
		},

		initialize: function () {
			// listen to the MetacatUI.appModel for changes in username
			this.listenTo(MetacatUI.appUserModel, 'change:username', this.render);
			this.listenTo(MetacatUI.appUserModel, 'change:fullName', this.render);
			this.listenTo(MetacatUI.appUserModel, 'change:loggedIn', this.render);
			this.listenTo(MetacatUI.appModel, 'change:headerType', this.toggleHeaderType);
		},

		render: function () {
			var name = MetacatUI.appUserModel.get('fullName') ? MetacatUI.appUserModel.get('fullName').charAt(0).toUpperCase() + MetacatUI.appUserModel.get("fullName").substring(1) : MetacatUI.appUserModel.get("username");

			//Insert the navbar template
			this.$el.html(
				this.template({
					username:   MetacatUI.appUserModel.get('username'),
					formattedName:   name,
					firstName:  MetacatUI.appUserModel.get('firstName'),
					loggedIn:   MetacatUI.appUserModel.get("loggedIn"),
					baseUrl:    MetacatUI.appModel.get('baseUrl')
				}));

			//Insert the sign-in button
			var signInView = new SignInView().render();
			this.$(".login-container").append(signInView.el);
			signInView.setUpPopup();

			//Initialize the tooltips in the navbar
			this.$(".tooltip-this").tooltip({
				delay: {show: 600},
				trigger: "hover",
				placement: "bottom"
			});

			this.changeBackground();
		},

		changeBackground: function(){
			// Change the background image if there is one
			var imageEl = $('#bg_image');
			if ($(imageEl).length > 0) {
				var imgCnt = $(imageEl).attr('data-image-count');

				//Randomly choose the next background image
				var bgNum = Math.ceil(Math.random() * imgCnt);

				$(imageEl).css('background-image', "url('" +  MetacatUI.root + "/js/themes/" +  MetacatUI.theme + "/img/backgrounds/bg" + bgNum + ".jpg')");
			}
		},

		triggerSearch: function() {
			// Get the search term entered
			var searchTerm = $("#search_txt").val();

			//Clear the input value
			$("#search_txt").val('');

			//Clear the search model to start a fresh search
			MetacatUI.appSearchModel.clear().set(MetacatUI.appSearchModel.defaults);

			//Create a new array with the new search term
			var newSearch = [searchTerm];

			//Set up the search model for this new term
			MetacatUI.appSearchModel.set('all', newSearch);

			// make sure the browser knows where we are
			MetacatUI.uiRouter.navigate("data", {trigger: true});

			// ...but don't want to follow links
			return false;

		},

		resetSearch: function(e){
			e.preventDefault();
			MetacatUI.appView.resetSearch();
		},

		resetEditor: function(e){
			e.preventDefault();

			//If we're currently on the editor view then refresh
			if(MetacatUI.appView.currentView.type == "Editor")
				MetacatUI.appView.showView(MetacatUI.appView.registryView);
			//Otherwise, just navigate to it
			else
				MetacatUI.uiRouter.navigate("submit", { trigger: true });
		},

		hideDropdown: function(){
			//Close the dropdown menu when a link is clicked
			this.$('.dropdown-menu').addClass('hidden');
			this.$('.dropdown').removeClass('open');
		},

		showDropdown: function(){
			//Only show the dropdown menu on hover when not on mobile
			if($(window).width() < 768) return;

			this.$('.dropdown-menu').removeClass('hidden');
		},

		showNav: function(){
			this.$("nav").slideToggle();
			this.$("#nav-trigger .icon").toggle();
		},

		showSubNav: function(e){
			var parentEl = e.target.tagName == "LI"? e.target : $(e.target).parent("li");
			if(!parentEl || !$(parentEl).length) return;

			$(parentEl).find(".sub-menu").slideToggle();
		},

		triggerOnEnter: function(e) {
			if (e.keyCode != 13) return;
			this.triggerSearch();
		},

		toggleHeaderType: function(){
			// set the navbar class based on what the page requested
			var headerType = MetacatUI.appModel.get('headerType');
			if (headerType == "default") {
				//Remove the alt class
				$(this.$el).removeClass("alt");
				//Add the class given
				$(this.$el).addClass(headerType);
			}
			else if(headerType == "alt"){
				//Remove the default class
				$(this.$el).removeClass("default");
				//Add the class given
				$(this.$el).addClass(headerType);
			}
		}

	});
	return NavbarView;
});
