nv.models.radarChart = function() {

    var metrics = null,
        margin  = {top: 40, right: 40, bottom: 40, left: 40},
        width  = 500,
        height = 500,
        radius = 100,
        color = nv.utils.defaultColor(),
        getX = function(d){ return d.label },
        getY = function(d){ return d.value },
        seriesTooltip = nv.models.tooltip(),
        tooltip = function(label,rate,point){
            var rateStr = 0;
            for(var k in rate){
                rateStr += rate[k];
            }
            return '<h3>'+label+'</h3>'+'<p>'+ rateStr +'</p>'
        },
        tooltips = true,
        transitionDuration = 500,
        pointRadius = 3,
        labelOffset = 10,
        dispatch = d3.dispatch('tooltipShow','tooltipHide');

    var showTooltip = function(e, offsetElement) {
        var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
            top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
            content = tooltip(e.label, e.rate);
        nv.tooltip.show([left, top], content, 'n', null, offsetElement);
    };

    var getMetrics = function(data){
        var extents={},metrics=[],extentAll=[];

        data.forEach(function(d){
            d.values.forEach(function(v){
                (extents[getX(v)] || (extents[getX(v)]=[])).push(getY(v));
                extentAll.push(getY(v));
            });
        });

        for(var k in extents){
            extents[k] = d3.extent( extents[k] );
            if(extents[k][0]===extents[k][1])extents[k][0]=0;
        }

        extentAll = [0,d3.extent(extentAll)[1]];

        data[0].values.forEach(function(v){
            metrics.push({ weight: getY(v) ,label:getX(v) , metric:getX(v), domain: data.length===1?extentAll:extents[getX(v)] });
        });

        return  metrics;
    }

    function chart(selection) {
        selection.each(function (data) {

            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom,
                container = d3.select(this);

            radius = Math.min(availableWidth, availableHeight) / 2;

            metrics = getMetrics(data);

            metrics = metrics
                .sort(function(a,b){return a.weight- b.weight})
                .map(function (metric, i) {

                metric.scale = d3.scale.linear()
                    .range([ 0, radius ])
                    .domain( metric.domain );

                metric.angle = 2 * Math.PI * i / metrics.length - Math.PI / 2;

                return metric;
            });

            data = data.map(function (d) {

                d.points = metrics.map(function (metric) {

                    var item = d.values.filter(function(v){
                        return getX(v) === metric.metric;
                    })[0];

                    var origX = metric.scale(  getY(item) );

                    return {
                        'label': d.key+'( '+metric.metric+' )' ,
                        'rate': [ getY(item) ],
                        'x': origX * Math.cos(metric.angle),
                        'y': origX * Math.sin(metric.angle)
                    };

                });

                return d;

            });

            var wrap = container.selectAll('.nv-radarChart').data([metrics]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-radarChart');

            var gEnter = wrapEnter.append('g').attr('transform', 'translate(' + (availableWidth / 2) + ', ' + (availableHeight / 2) + ')').attr('class','nv-radar');
            var g = wrap.select('g');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            g.attr('width', availableWidth)
                .attr('height', availableHeight);

            var backgroundEnter = gEnter.append("g").attr('class','background');

            chart.drawBackground( backgroundEnter );

            gEnter.selectAll('.axis')
                .data(function (d) { return d; })
                .enter()
                .append('g')
                .attr('class', 'axis')
                .each(function (d) {

                    d3.select(this).append('g')
                        .attr('class', d.metric + ' axisScale')
                        .attr('transform', 'rotate(' + (d.angle * 180 / Math.PI) + ')')
                        .call( d3.svg.axis().scale(d.scale).tickSize(0) );

                    chart.drawAxisLabel(d3.select(this));
                });

            gEnter.selectAll('.radar-area')
                .data(data)
                .enter()
                .append('g')
                .attr('class', function (d, i) { return 'nv-groups radar-area radar-area' + i; })
                .attr('fill',function(d,i){ return color(d,i) })
                .attr('stroke',function(d,i){return color(d,i) })
                .each(function () {
                    chart.drawArea(d3.select(this));
                })

        });
    }

    chart.transitionDuration = function(_){
        if (!arguments.length) {
            return transitionDuration;
        }
        transitionDuration = _;
        return chart;
    }

    chart.x = function(_){
        if (!arguments.length) {
            return getX;
        }
        getX = _;
        return chart;
    }

    chart.y = function(_){
        if (!arguments.length) {
            return getY;
        }
        getY = _;
        return chart;
    }

    chart.tooltips = function(_){
        if (!arguments.length) {
            return tooltips;
        }
        tooltips = _;
        return chart;
    }

    chart.metrics = function(_){
        if (!arguments.length) {
            return metrics;
        }
        metrics = _;
        return chart;
    }

    chart.color = function(_){
        if (!arguments.length) {
            return color;
        }
        color = _;
        return chart;
    }

    chart.width = function(_){
        if (!arguments.length) {
            return width;
        }
        width = _;
        return chart;
    }

    chart.height = function(_){
        if (!arguments.length) {
            return height;
        }
        height = _;
        return chart;
    }

    chart.radius = function (_) {
        if (!arguments.length) {
            return radius;
        }
        radius = _;
        return chart;
    };

    chart.margin = function (_) {
        if (!arguments.length) {
            return margin;
        }
        margin = _;
        return chart;
    };

    chart.pointRadius = function (_) {
        if (!arguments.length) {
            return pointRadius;
        }
        pointRadius = _;
        return chart;
    };

    chart.drawBackground = function (selection) {

        var r = radius;
        var step = r / 4;
        var data = [];
        var loop = 0;

        var lineXY = function(s){
            return s.attr('x1',function(d){return d.x0}).attr('y1',function(d){return d.y0}).attr('x2',function(d){return d.x}).attr('y2',function(d){return d.y});
        }

        while(r){
            var points = metrics.map(function(m,i){
                console.log(m.label);
                return {
                    loop: loop,
                    x : r * Math.cos(m.angle),
                    y : r * Math.sin(m.angle),
                    x0: r * Math.cos(metrics[ i===0?metrics.length-1:i-1 ].angle),
                    y0: r * Math.sin(metrics[ i===0?metrics.length-1:i-1 ].angle)
                }
            });
            data.push(points);
            loop++;
            r -= step;
        }

        selection.data([data]).selectAll('g').data(function(d){return d}).enter().append('g').selectAll('line')
            .data(function(d){return d;}).enter()
            .append('line').attr('stroke',function(d){ return d.loop===0?'#666':'#ccc'}).attr('stroke-width',function(d){ return d.loop===0?2:1 }).call(lineXY);

    };

    chart.drawAxisLabel = function (selection) {

        selection.append('text')
            .text(function (d) { return d.label; })
            .attr('class', 'axisLabel')
            .attr('x', function (d) {

                var pos = (radius + labelOffset) * Math.cos(d.angle);

                if (Math.PI / 2 === Math.abs(d.angle)) {
                    pos -= this.getComputedTextLength() / 2;
                } else if (Math.abs(d.angle) > Math.PI / 2) {
                    pos -= this.getComputedTextLength();
                }

                return pos;
            })
            .attr('y', function (d) { return (radius + labelOffset) * Math.sin(d.angle); });
    };

    chart.drawArea = function (selection) {

        selection.append('path')
            .attr('class', 'radar-path')
            .attr('d', function (d) {
                return d3.svg.line()
                    .x(function (d) { return d.x; })
                    .y(function (d) { return d.y; })
                    .interpolate('linear-closed')
                    .call(this, d.points);
            })
            .on('mousemove',function(d,i){
                d3.select(this).classed('hover',true);
                var e = {
                    label: d.key,
                    rate: d.values,
                    point: d.point,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY]
                }

                var metricsIndex = metrics.map(function(d){return d.metric});

                seriesTooltip
                    .position({left: e.pos[0], top: e.pos[1]})
                    .chartContainer(this.parentNode)
                    .enabled(tooltips)
                    .data(
                    {
                        value: e.label ,
                        series: e.rate.map(function(d){
                            return {
                                key:getX(d),
                                value:getY(d),
                                color:color(d,metricsIndex.indexOf(getX(d)))
                            }
                        })
                    }
                )();
                dispatch.tooltipShow(e);
            }).on('mouseout',function(d,i){
                d3.select(this).classed('hover',false);
                var e = {
                    label: d.label,
                    rate: d.rate,
                    point: d.point,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY]
                }
                nv.tooltip.cleanup();
                dispatch.tooltipHide(e);
            });
        ;

        selection.selectAll('.radar-point')
            .data(function (d) {
                return d.points;
            })
            .enter()
            .append('circle')
            .attr('cx', function (d) { return d.x; })
            .attr('cy', function (d) { return d.y; })
            .attr('r', pointRadius)
            .attr('class', 'radar-point nv-point')
//            .attr('fill',function(d,i){return color(d,i)})
            .attr('stroke',function(d,i){return color(d,i)})
            .on('mouseover',function(d,i){
                d3.select(this).classed('hover',true);
                var e = {
                    label: d.label,
                    rate: d.rate,
                    point: d.point,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY]
                }
                if(tooltips)showTooltip(e,this.parentNode);
                dispatch.tooltipShow(e);
            }).on('mouseout',function(d,i){
                d3.select(this).classed('hover',false);
                var e = {
                    label: d.label,
                    rate: d.rate,
                    point: d.point,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY]
                }
                nv.tooltip.cleanup();
                dispatch.tooltipHide(e);
            });
    };

    return chart;
}