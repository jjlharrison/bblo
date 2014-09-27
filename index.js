define([
    'jquery',
    'underscore',
    'backbone'
], function($, _, Backbone) {

    var views = {};

    var View = Backbone.View.extend({

        subviews: {},

        doRender: function(template) {
            var view = this;

            return new Promise(function(fulfill, reject) {
                var target = view.target || '.app',
                    $target = view.$layout ? view.$layout.find(target) : $(target);

                view.$el.html(template(view.model)).addClass('cms-view').data('cms-view', view);

                // Tidy up views being replaced.
                $target.find('.cms-view').each(function() {
                    var oldView = $(this).data('cms-view');
                    delete views[oldView.cmsid];
                    oldView.remove();
                }).end().empty();

                $target.append(view.$el);

                views[view.cmsid] = view;

                view.renderSubviews().then(fulfill);
            });
        },

        renderTemplate: function() {
            var view = this;

            view.cmsid = view.cmsid || _.uniqueId('cms-view-');

            return new Promise(function(fulfill, reject) {
                view.loadLayout().then(function() {
                    var doRender = _.bind(view.doRender, view);

                    // Pre-defined template.
                    if (_.isFunction(view.template)) { doRender(view.template).then(fulfill); }

                    // Named template.
                    else if (_.isString(view.template)) {
                        require(['templates/' + view.template], function(template) {
                            doRender(template).then(fulfill);
                        });
                    }
                });
            });
        },

        loadLayout: function() {
            var view = this;
            return new Promise(function(fulfill, reject) {
                if (view.layout) {
                    if (views[view.layout]) {
                        this.$layout = views[view.layout].$el;
                        fulfill();
                    }
                    else {
                        require(['layouts/' + view.layout], function(Layout) {
                            var layout = new Layout();
                            layout.render();
                            view.$layout = layout.$el;
                            fulfill();
                        });
                    }
                }
                else { fulfill(); }
            });
        },

        render: function() { return this.renderTemplate(); },

        renderSubviews: function() {
            var view = this;
            return new Promise(function(fulfill, reject) {
                var promises = [];
                view.$('[data-subview]').each(function() {
                    var $subview = $(this);
                    promises.push(view.renderSubview($subview.attr('data-subview'), $subview));
                });
                Promise.all(promises).then(fulfill);
            });
        },

        renderSubview: function(name, $subviewTarget) {
            var view = this, subview = view.subviews[name];
            return new Promise(function(fulfill, reject) {
                if (_.isFunction(subview)) {
                    subview = subview(view, $subviewTarget);
                    subview.render().then(fulfill);
                }
                else if (subview) reject(new Error('Values of subview has should be a function, "' + name + '" references a ' + typeof subview + '.'));
                else reject(new Error('Unknown subview "' + name + '".'));
            });
        },

        initialize: function(options) { 
            _.extend(this, options);
        }
    });

    return { View: View, views: views };
});