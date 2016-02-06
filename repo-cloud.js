
var d3 = require('d3');
var cloud = require('d3-cloud');
var request = require('superagent');

function allRepos(username, next, n) {
  request
    .get('https://api.github.com/users/'+username+'/repos')
    .query({page: n || 1, per_page: 100})
    .end(function(error, res) {
      if(error) return next(error);
      if(res.body.length < 100) return next(null, res.body);
      allRepos(username, function(error, repos) {
        if(error) return next(error);
        next(null, res.body.concat(repos));
      }, (n||1)+1);
    });
}

function getUserRepos(username, next) {
  allRepos(username, function(error, repos) {
    if(error) return next(error);
    next(null, repos.map(function(repo) {
      return {
        name: repo.name,
        html_url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
      };
    }));
  });
}

var $cloud = document.getElementById('cloud');
var $username = document.getElementById('username');

function updateCloud() {
  console.log('update-cloud');
  var username = $username.value;
  window.location.hash = username;

  getUserRepos(username, function(error, repos) {
    if(error) {
      $cloud.innerHTML = "<i>"+error+"</i>";
    } else {
      $cloud.innerHTML = "";
      draw($cloud, repos);
      // $cloud.innerHTML = list(repos);
    }
  });
}

window.updateCloud = updateCloud;

function list(repos) {
  return "<ul>"+repos.map(function(repo) {
    return [
      "<li>", 
        "<a href='"+repo.html_url+"'>"+repo.name+"</a>",
      "</li>",
    ].join('');
  })+"</ul>";
}

function draw(container, repos) {
  var fill = d3.scale.category20();

  var styles = window.getComputedStyle(container);
  // console.log(size); return;
  var size = {
    width: parseInt(styles.width, 10),
    height: parseInt(styles.height, 10)
  };
  // console.log(size); return;

  var star_avg = repos
    .map(function(r) { return r.stars; })
    .reduce(function(x,y) { return x+y;}, 0) / repos.length;

  var layout = cloud()
    .size([size.width, size.height])
    // .size([1, 1])
    .words(repos.map(function(repo) {
      var size = 20 + Math.ceil((1.5 * repo.stars) / star_avg);
      return {text: repo.name, size: size, href: repo.html_url};
    }))
    .padding(5)
    .rotate(function() { return 0; ~~(Math.random() * 2) * 90; })
    .font("Impact")
    .fontSize(function(d) { return d.size; })
    .on("end", _draw);

  layout.start();

  function _draw(words) {
    d3.select("#cloud").append("svg")
      .attr("width", layout.size()[0])
      .attr("height", layout.size()[1])
    .append("g")
      .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
    .selectAll("text")
      .data(words)
    .enter().append("a")
      .attr("xlink:href", function(d) {return d.href;})
      .attr("href", function(d) {return d.href;})
      .append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", function(d, i) { return fill(i); })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
  }
}

$username.value = window.location.hash.slice(1) || 'andrejewski';
$username.onchange = updateCloud;
updateCloud();

