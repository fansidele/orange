// Author: Harris Novick

var Orange = {

  init: function() {    
    Orange.cookies.load_queries();
    Orange.hnsearch.fetch_json(Orange.urls.front_hn, "front");
    Orange.listeners.init();
  },

	cache: {},
	
	articles: [],

	cookies: {
	  status: function(cookie) {
	    return typeof(cookie);
	  },    

	  queries: function() {
	    return $.cookie('orange_queries');
	  },

	  previous_queries: function() {
	    if (Orange.cookies.status(Orange.cookies.queries()) === "object") {
	      return [];
	    } else {
	      return Orange.cookies.queries().split(",");       
	    }
	  },

	  load_queries: function() {
			var queries_list = "",
					queries = Orange.cookies.previous_queries().reverse(),
					i = queries.length,
					query;
							
			while (i--) {
				query = queries[i];
				if (query == "hn") {
					queries_list += "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">news.ycombinator.com</a></li>";
				} else if (query !== "") {
					queries_list += "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + decodeURI(query) + "</a></li>";
				} else {
					Orange.cookies.remove_queries(query);
				}
			}

			$("nav ul.searches").append(queries_list).hide().fadeIn(350);
	  },

	  set_queries: function(query, display_query) {
			var search = "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>";
	    if (Orange.cookies.status(Orange.cookies.queries()) === "object") {
				$("nav ul.searches").append(search).children(':last').hide().fadeIn(100);
	      var first_cookie = [];
	      first_cookie.push(query);
	      $.cookie('orange_queries', first_cookie, { expires: 365 });
	    } else {
				if ($("nav ul.searches li a[data-search='" + query + "']").length < 1) {
					$("nav ul.searches").append(search).children(':last').hide().fadeIn(100);
	        var cookies = Orange.cookies.previous_queries();
					cookies.push(query);
	        $.cookie('orange_queries', cookies.join(","));								
				}
	    }
	  },

	  remove_queries: function(value) {
			var cookies = Orange.cookies.previous_queries()
			cookies.splice(cookies.indexOf(value), 1);
	    $.cookie('orange_queries', cookies);
	  },

	  destroy_queries: function() {
	    $.cookie('orange_queries', null);
	  }
	},

  spinner: {
    opts: {
      lines: 16, // The number of lines to draw
      length: 0, // The length of each line
      width: 7, // The line thickness
      radius: 3, // The radius of the inner circle
      color: '#F60', // #rgb or #rrggbb
      speed: 1.3, // Rounds per second
      trail: 50, // Afterglow percentage
      shadow: false // Whether to render a shadow     
    },
    show: function() {
      $("#spinner").spin(Orange.spinner.opts);
    },
    hide: function() {
      $("#spinner").spin(false);
    }
  },

	triggers: {
		article: {}
	},

  listeners: {
    init: function() {
			Orange.listeners.window();
      Orange.listeners.nav();
      Orange.listeners.search();
      Orange.listeners.close();
      Orange.listeners.username();
			Orange.listeners.domain();
      Orange.listeners.article();
    },

		window: function() {
			$(window).bind('scrollstop', function(){
				Orange.extraction.init();
      });
		},

    nav: function() {
      $("nav a:not('.search, .close')").live("click", function(e) {
        var term = $(this).data("search");
        var search = "";
        if (term === "front") {
          search = Orange.urls.front_hn;
        } else if (term === "ask") {
					search = Orange.urls.ask_hn;
        } else if (term === "show") {
					search = Orange.urls.show_hn;
				} else {
          search = Orange.urls.search_hn(term);					
				}
        Orange.hnsearch.fetch_json(search, term);
        e.preventDefault();
      });
    }, 

    search: function() {
      var $input = Orange.els.search.find("input.query");
      var $button = Orange.els.search.find("input.btn");     

      $("nav a.search").click(function(e) {   
        if (Orange.els.search.filter(":visible").length < 1) {
          Orange.els.search.show(0, function(){
            $input.focus();

            $(window).keypress(function(e) {
              if(e.keyCode === 13) {
                $button.click();
              }
            });       

            $button.one("click", function() {
              var display_query = $input.val();
							var query = encodeURI(display_query);
              if (display_query === "") {
                Orange.els.search.hide();
              } else {
                Orange.hnsearch.fetch_json(Orange.urls.search_hn(query), query);
                Orange.cookies.set_queries(query, display_query);                
              }
            });

            $("body").bind("click", function(event) {
              if ($(event.target).closest(".search.popover, nav a.search").length < 1) {
                Orange.els.search.hide();
                $button.unbind("click");
              }
            });         
          });         
        }
        e.preventDefault();
      });   
    },

    close: function() {
      $("nav").delegate("a.close", "click", function(e) {
				var $this = $(this);
        var query = $this.siblings("a").data("search");
        $this.parents("li").fadeOut(100, function() {
					$this.remove();
				});
        if ($("nav ul.searches li").length < 1) {
          Orange.cookies.destroy_queries();
        } else {
          Orange.cookies.remove_queries(query);
        }
        e.preventDefault();
      });     
    },

		username: function() {
			$("article.item li.user a").live("click", function(e) {
				var display_query = $(this).text();
				var query = encodeURI(display_query);
				Orange.hnsearch.fetch_json(Orange.urls.user_hn(query), "");
				Orange.cookies.set_queries(query, display_query);  
				e.preventDefault();
			});
		},
		
		domain: function() {
			$("article.item a.favicon").live("click", function(e) {
				var display_query = $(this).attr("href");
				var query = encodeURI(display_query);
				if (display_query == "news.ycombinator.com") {
					Orange.hnsearch.fetch_json(Orange.urls.search_hn("hn"), "");
				} else {
					Orange.hnsearch.fetch_json(Orange.urls.domain_hn(query), "");
				}				
				Orange.cookies.set_queries(query, display_query);  
				e.preventDefault();
			});
		},

    article: function() {
			var $container = $("#article_container");
			var $article = $container.find("article");
			var $page = $article.find(".page");
			var article, $content, filtered_content, $youtube_embed, youtube_url;
      Orange.els.grid.live("click", function(e) {
				if ($(e.target).hasClass("title") || $(e.target).hasClass("comment-count")) {
					var $this = $(e.target).parents("article.item");
					article = Orange.articles[$this.data("article")];
					$content = article.content;
					if (article.num_comments > 0) {
						if ($(e.target).hasClass("comment-count")) {
							Orange.hnsearch.fetch_comments(article.sigid, true); 
						} else {
							Orange.hnsearch.fetch_comments(article.sigid);
						}						
					}	
					if ($content) {
						filtered_content = Orange.utils.clean_content($content);
					}	else {
						filtered_content = article.hn_text;
					}		
	        Orange.els.reader.fadeIn(100);
					$container.stop().animate({
						"margin-top" : "0"
					}, 300);
					$("html, body").toggleClass("frozen");				
					$article.find("#article_title").text(article.title)
						.end().find("#page_content").append(filtered_content).imagefit();

					prettyPrint();
								
					Orange.els.reader.click(function(e) {
						if (e.target !== $page[0] && $(e.target).parents(".page").length < 1) {
							$container.stop().animate({
								"margin-top" : "101%"
							}, 200, function() {
								Orange.els.reader.fadeOut(100, function() {
									$("html, body").toggleClass("frozen");
									$(this).unbind("click").find("#page_content, #article_comments").html("");									
								});
							});
						}
					});
					e.preventDefault();					
				}
      });
    }
  },

	els: {
		search: $("#search"),
		grid: $("#article_grid"),
		reader: $("#reader")
	},

	urls: {
	  front_hn: "http://api.thriftdb.com/api.hnsearch.com/items/_search?limit=30&boosts[fields][points]=0.15&boosts[fields][num_comments]=0.15&boosts[functions][pow(2,div(div(ms(create_ts,NOW),128000),72))]=200.0&sortby=product(points,pow(2,div(div(ms(create_ts,NOW),128000),72)))%20desc&filter[fields][type]=submission&callback=?",
		user_hn: function(user) {
			return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][username]=" + user + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=100&callback=?"			
		},
		domain_hn: function(domain) {
			return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][domain]=" + domain + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=100&callback=?"			
		},
		ask_hn: "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=ask%20hn&filter[fields][create_ts]=[NOW-30DAYS%20TO%20NOW]&filter[fields][type]=submission&sortby=create_ts%20desc&limit=100&callback=?",
		show_hn: "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=show%20hn&filter[fields][create_ts]=[NOW-30DAYS%20TO%20NOW]&filter[fields][type]=submission&sortby=create_ts%20desc&limit=100&callback=?",
	  search_hn: function(term) {
	    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=" + term + "&filter[fields][create_ts]=[NOW-30DAYS%20TO%20NOW]&filter[fields][type]=submission&sortby=create_ts%20desc&limit=100&callback=?";
	  },
		comments_hn: function(sigid) {
			return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type]=comment&filter[fields][parent_sigid]=" + sigid + "&sortby=points%20desc&limit=100&callback=?";
		}
	},
	
	hnsearch: {
	  fetch_json: function(url, query) {
	    Orange.spinner.show();
	    $.jsonp({
				url: url,
				success: function(data) {
					Orange.hnsearch.parse_json(data, query);
				},
				error: function() {
					Orange.hnsearch.fetch_json(Orange.urls.fallback, "search");
				},
				complete: function() {
					Orange.spinner.hide();
				},
				dataFilter: function(data) {
					return data.results	
				},
				timeout: 15000
			});
	  },

	  parse_json: function(results, query) {    

	    Orange.articles = [];
	
			var result = {},
					article = {},
					i = results.length;
					
			while (i--) {
			  result = results[i].item;

	      article = {
					sigid: result._id || "",
	        title: result.title || "",
	        hn_text: result.text || "",
					domain: result.domain || "news.ycombinator.com",
	        url: result.url || "http://news.ycombinator.com/item?id=" + result.id || "",
	        points: result.points || "0",
	        num_comments: result.num_comments || "0",
	        user: result.username || "",
	        published_date: Date.fromString(result.create_ts).toRelativeTime() || "",
	        hn_url: "http://news.ycombinator.com/item?id=" + result.id || ""
	      };
	
				article["hn_user_url"] = "http://news.ycombinator.com/user?id=" + article.user || "";
				article["cache_url"] = Orange.utils.normalize_urls(article.url);
	
 				if (query === "ask") {
	        article["title"] = article.title.replace(/^Ask HN\: |Ask HN\:|Ask HN - |Ask HN -/i, "");
	      } else if (query === "show") {
	        article["title"] = article.title.replace(/^Show HN\: |Show HN\:|Show HN - |Show HN -/i, "");
	      }
				Orange.articles.push(article);
			}
			
			i = Orange.articles.length
			var articles_string = "<div>"
			
			while (i--) {
				article = Orange.articles[i]
				
				articles_string += '<article class="item pre-render" title="' + article.domain + '" data-article="' + i + '"><div class="thumbnail"></div><p class="date"><a href="' + article.hn_url + '" target="_blank">' + article.published_date + '</a></p><a class="favicon" href="' + article.domain + '"><img src="http://g.etfv.co/' + article.url + '?defaulticon=lightpng" alt="' + article.domain + '" /></a><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." /><h3 class="title"><a href="' + article.url + '" target="_blank">' + article.title + '</a></h3><div class="content"><div class="body article"></div><footer><ul class="meta unstyled"><li class="user"><a href="' + article.hn_user_url + '" target="_blank">' + article.user + '</a></li><li class="points"><img src="img/upvotes.png" alt="points" /><a href="#">' + article.points + '</a></li><li class="comments"><img src="img/comments.png" alt="comments" /><a class="comment-count" href="#">' + article.num_comments + '</a></li></ul></footer></div></article>';
			}
			
			articles_string += "</div>";

	    Orange.spinner.hide();
			Orange.els.grid.html(articles_string);
			
	    Orange.hnsearch.render_json();
	  },

	  render_json: function() {
	    Orange.els.search.hide().find("input.query").val("");
			$(window).unbind("scrollstop").scrollTop(0);
			(function n(e) {
				e.eq(0).stop().animate({ 
					"opacity" : "1.0"
				}, 29, function() {
					n(e.slice(1));
				});
			})($("article.item"));
			Orange.listeners.window();
			Orange.extraction.init();		
	  },
	
		fetch_comments: function(sigid, scroll) {
			
			$.jsonp({
				url: Orange.urls.comments_hn(sigid),
				success: function(results) {
					var i = results.length,
							comments = "<ul class='comments'><p class='end-sign'>&#10070;</p><h5 class='header'>Comments</h5>",
							result;
							
					if (i > 0) {
						while (i--) {
							result = results[i];
							comments += "<li class='comment'><header><a class='user' href='http://news.ycombinator.com/user?id=" + result.item.username + "'>" + result.item.username + "</a></header><p>" + result.item.text + "</p></li>";					
						}

						comments += "</ul>";				
						$("#reader #article_comments").html(comments);					
					} else {
						return;
					}
				},
				complete: function() {
					if (scroll) {
						$("#article_container").scrollTop($("#article_comments h5.header").position().top - 100);
					}
				},
				dataFilter: function(data) {
					return data.results;
				},
				timeout: 10000
			});
		}
	},
	
	extraction: {		
		init: function() {
			$("article.item.pre-render:in-viewport").each(function() {
				var $this = $(this),
						article = Orange.articles[$this.data("article")],
						cache = Orange.cache[article.cache_url];
						
				if (cache) {
					Orange.extraction.success($this, cache["content"], true);
					Orange.extraction.complete($this);
				} else {
					if (article.domain !== "news.ycombinator.com") {
						try {
							Orange.extraction.start($this, article.url, article.domain); 
						} catch(e) {
							Orange.extraction.complete($this);
						};					 
		      } else {
						Orange.extraction.complete($this);
					}					
				}
			});			
		},
		
		start: function(el, url, domain) {
			el.removeClass("pre-render");		
			$.ajax({
			  url: "orange.php?clean=true&url=" + url + "&domain=" + domain,
				cache: true,
				success: function(data) {
					Orange.extraction.success(el, data);					
				},
				complete: function() {
					Orange.extraction.complete(el);
				},
				dataFilter: function(data) {
					try {
						return $(data).wrap("<div />");
					} catch(e) {
						el.addClass("error");
						return $("<div></div>");
					}					
				},
				timeout: 30000
			});	
		},
		
		success: function(el, data, cached) {
			el.removeClass("pre-render");	
			
			var article = Orange.articles[el.data("article")],
					init = true,
					article_images,
					best_image;

			try {
				$(Orange.cache[article.url]["thumb"]).appendTo(el.find(".thumbnail")).scaleImage({ fade: 270 });
				article.content = Orange.cache[article.url]["content"];		
				Orange.extraction.complete(el);	
			} catch(e) {
				if (article) {
					article.content = Orange.utils.dispose_of_useless_images(data, article.domain);

					var cache_article = Orange.cache[article.cache_url] = {};

					article_images = article.content.find("img").removeAttr("style");

					if (init == true) {
						article_images.load();				
					}

		      best_image = article_images.sort(Orange.utils.sort.by_image_size)[0] || $("<img src='img/1x1.png' />");

		      if (best_image && best_image.width >= 150 && best_image.height >= 150) {
		        $(best_image).clone().appendTo(el.find(".thumbnail")).scaleImage({ fade: 270 });  
		      } else {				
						article_images.load(function() {				
							if (init == true && best_image && best_image.width >= 150) {
								init = false;
								$(best_image).clone().appendTo(el.find(".thumbnail")).scaleImage({ fade: 270 });							
							}
						});
					}

					cache_article["content"] = article.content;
					cache_article["thumb"] = best_image;					
				}					
			};	
		},
		
		complete: function(el) {
			el.removeClass("pre-render").find(".loader").remove();
		}
	},
	
	utils: {
	  sort: {
	    by_image_size: function(a, b) {
	      return (b.width+b.height) - (a.width+a.height);
	    }
	  },
			
		normalize_urls: function(url) {
			url = url.split("//");
			url = url[1] || "" + url;
			while (!url.match(/[a-zA-Z0-9]$/))  {
				url = url.substring(0, url.length-1);
			}
			return url;
		},

		dispose_of_useless_images: function(content, domain) {		
			var images = content.find("img"),
					i = images.length;
			
			if (i > 30) {
				images.remove();
			} else {		
				var image,
				src;
				
				while (i--) {
					image = images[i];
					src = $(image).attr("src");
					if (src.substr(0,1) == "/") {
						$(image).attr("src", "http://" + domain + src);
					}
					if (image.width > 0 && image.width < 150 && image.height > 0 && image.height < 150) {
						$(image).remove();
					}
				}			
			}
			return content;
		},		

		clean_content: function(content) {
			content.find("pre").addClass("prettyprint");
			return content;
		}
	}
};

$.fn.spin = function(opts) {
  this.each(function() {
    var $this = $(this),
        data = $this.data();

    if (data.spinner) {
      data.spinner.stop();
      delete data.spinner;
    }
    if (opts !== false) {
      data.spinner = new Spinner($.extend({color: $this.css('color')}, opts)).spin(this);
    }
  });
  return this;
};

$(Orange.init());