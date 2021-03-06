
nv.models.lineWithBrushChart = function() {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        , legend = nv.models.legend()
        , interactiveLayer = nv.interactiveGuideline()
        ;

    var margin = {top: 30, right: 20, bottom: 50, left: 60}
        , color = nv.utils.defaultColor()
        , width = null
        , height = null
        , showLegend = false
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , useInteractiveGuideline = false
        , tooltips = true
        , tooltip = function(key, x, y, e, graph) {
            return '<h3>' + key + '</h3>' +
                '<p>' +  y + ' at ' + x + '</p>'
        }
        , x
        , y
        , state = {}
        , defaultState = null
        , noData = 'No Data Available.'
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState','brush','startPlay','stopPlay','finishPlay','brushPlaying')
        , transitionDuration = 250
        , brush =  d3.svg.brush()
        , brushExtent = null
        , playMode = 1
        , showBrushExtentLabel = true
        , step = function( _xDomain,data ){ return (_xDomain[1]- _xDomain[0])/data.length; }
        , initStep = function(brushStep){ return 4*brushStep; }
        ;

    xAxis
        .orient('bottom')
        .tickPadding(7)
    ;
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function(e, offsetElement) {

        // New addition to calculate position if SVG is scaled with viewBox, may move TODO: consider implementing everywhere else
        if (offsetElement) {
            var svg = d3.select(offsetElement).select('svg');
            var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
            if (viewBox) {
                viewBox = viewBox.split(' ');
                var ratio = parseInt(svg.style('width')) / viewBox[2];
                e.pos[0] = e.pos[0] * ratio;
                e.pos[1] = e.pos[1] * ratio;
            }
        }

        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
            y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
            content = tooltip(e.series.key, x, y, e, chart);

        nv.tooltip.show([left, top], content, null, null, offsetElement);
    };

    //============================================================


    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this),
                that = this;

            var availableWidth = (width  || parseInt(container.style('width')) || 960)
                    - margin.left - margin.right,
                availableHeight = (height || parseInt(container.style('height')) || 400)
                    - margin.top - margin.bottom;


            chart.update = function() { container.transition().duration(transitionDuration).call(chart) };
            chart.container = this;

            //set state.disabled
            state.disabled = data.map(function(d) { return !!d.disabled });


            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }

            //------------------------------------------------------------
            // Display noData message if there's nothing to show.

            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                var noDataText = container.selectAll('.nv-noData').data([noData]);

                noDataText.enter().append('text')
                    .attr('class', 'nvd3 nv-noData')
                    .attr('dy', '-.7em')
                    .style('text-anchor', 'middle');

                noDataText
                    .attr('x', margin.left + availableWidth / 2)
                    .attr('y', margin.top + availableHeight / 2)
                    .text(function(d) { return d });

                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup Scales

            x = lines.xScale();
            y = lines.yScale();

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup containers and skeleton of chart

            var wrap = container.selectAll('g.nv-wrap.nv-lineWithBrushChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineWithBrushChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis');
            gEnter.append('g').attr('class', 'nv-linesWrap');
            gEnter.append('g').attr('class', 'nv-interactive');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-brushBackground');
            gEnter.append('g').attr('class', 'nv-x nv-brush');

            g.select("rect").attr("width",availableWidth).attr("height",availableHeight);
            //------------------------------------------------------------
            // Legend

            if (showLegend) {
                legend.width(availableWidth);

                g.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;
                }

                wrap.select('.nv-legendWrap')
                    .attr('transform', 'translate(0,' + (-margin.top) +')')
            }

            //------------------------------------------------------------

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            //------------------------------------------------------------
            // Main Chart Component(s)


            //------------------------------------------------------------
            //Set up interactive layer
            if (useInteractiveGuideline) {
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeight)
                    .margin({left:margin.left, top:margin.top})
                    .svgContainer(container)
                    .xScale(x);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }


            lines
                .width(availableWidth)
                .height(availableHeight)
                .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled }));


            var linesWrap = g.select('.nv-linesWrap')
                .datum(data.filter(function(d) { return !d.disabled }))

            linesWrap.transition().call(lines);

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup Brush

            brush.x(x)
                .on('brush', onBrush);

            if (brushExtent) brush.extent(brushExtent);

            var brushBG = g.select('.nv-brushBackground').selectAll('g')
                .data([brushExtent || brush.extent()]);

            var brushBGenter = brushBG.enter()
                .append('g');

            brushBGenter.append('rect')
                .attr('class', 'left')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', availableHeight);

            brushBGenter.append('rect')
                .attr('class', 'right')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', availableHeight);

            brushBGenter.append('text')
                .attr('class','extent-left')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', availableHeight);

            brushBGenter.append('text')
                .attr('class','extent-right')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', availableHeight);

            var gBrush = g.select('.nv-x.nv-brush')
                .call(brush);
            gBrush.selectAll('rect')
                //.attr('y', -5)
                .attr('height', availableHeight);
            gBrush.selectAll('.resize').append('path').attr('d', resizePath);

            onBrush({silent:true});


            //------------------------------------------------------------
            // Setup Axes

            if (showXAxis) {
                xAxis
                    .scale(x)
                    .ticks( availableWidth / 100 )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')');
                g.select('.nv-x.nv-axis')
                    .transition()
                    .call(xAxis);
            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    .ticks( availableHeight / 36 )
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis')
                    .transition()
                    .call(yAxis);
            }
            //------------------------------------------------------------




            // Taken from crossfilter (http://square.github.com/crossfilter/)
            function resizePath(d) {
                var e = +(d == 'e'),
                    x = e ? 1 : -1,
                    y = availableHeight / 3;
                return 'M' + (.5 * x) + ',' + y
                    + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
                    + 'V' + (2 * y - 6)
                    + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
                    + 'Z'
                    + 'M' + (2.5 * x) + ',' + (y + 8)
                    + 'V' + (2 * y - 8)
                    + 'M' + (4.5 * x) + ',' + (y + 8)
                    + 'V' + (2 * y - 8);
            }


            function updateBrushBG() {
                if (!brush.empty()) brush.extent(brushExtent);
                var _showBrushExtent = !brush.empty() ;
                brushBG
                    .data([brush.empty() ? x.domain() : brushExtent])
                    .each(function(d,i) {
                        var leftWidth = x(d[0]) - x.range()[0],
                            rightWidth = x.range()[1] - x(d[1]);

                        d3.select(this).select('.left')
                            .attr('width',  leftWidth < 0 ? 0 : leftWidth);

                        if(showBrushExtentLabel){
                            var extentLeft = d3.select(this).select('.extent-left').text( _showBrushExtent? xAxis.tickFormat()(d[0]):"");
                            var extentLeftWidth = +window.getComputedStyle(extentLeft[0][0]).width.replace('px','');
                            extentLeft.attr('x',x(d[0])-extentLeftWidth-10).attr('y',availableHeight*(1-0.618));

                            d3.select(this).select('.extent-right')
                                .text(_showBrushExtent? xAxis.tickFormat()(d[1]):"").attr('x',x(d[1])+10).attr('y',availableHeight*(1-0.618));
                        }

                        d3.select(this).select('.right')
                            .attr('x', x(d[1]))
                            .attr('width', rightWidth < 0 ? 0 : rightWidth);
                    });
            }

            function onBrush(option) {
                brushExtent = brush.empty() ? null : brush.extent();
                var extent = brush.empty() ? x.domain() : brush.extent();
                if (Math.abs(extent[0] - extent[1]) <= 1) {
                    return;
                }
                if(option && !option.silent || !option){
                    if(chart.playTimer===null){
                        dispatch.brush({extent: extent, brush: brush});
                    }else{
                        dispatch.brushPlaying({extent: extent, brush: brush});
                    }
                }
                updateBrushBG();
            }

            brush.update = function (option) {
                var extent = option && option.extent;
                extent && brush.extent(extent);
                gBrush.call(brush);
                onBrush(option);
            };

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('legendClick', function(d,i) {
                d.disabled = !d.disabled;

                if (!data.filter(function(d) { return !d.disabled }).length) {
                    data.map(function(d) {
                        d.disabled = false;
                        wrap.selectAll('.nv-series').classed('disabled', false);
                        return d;
                    });
                }

                state.disabled = data.map(function(d) { return !!d.disabled });
                dispatch.stateChange(state);

                selection.transition().call(chart);
            });

            legend.dispatch.on('legendDblclick', function(d) {
                //Double clicking should always enable current series, and disabled all others.
                data.forEach(function(d) {
                    d.disabled = true;
                });
                d.disabled = false;

                state.disabled = data.map(function(d) { return !!d.disabled });
                dispatch.stateChange(state);
                chart.update();
            });

            interactiveLayer.dispatch.on('elementMousemove', function(e) {
                lines.clearHighlights();
                var singlePoint, pointIndex, pointXLocation, allData = [];
                data
                    .filter(function(series, i) {
                        series.seriesIndex = i;
                        return !series.disabled;
                    })
                    .forEach(function(series,i) {
                        pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                        lines.highlightPoint(i, pointIndex, true);
                        var point = series.values[pointIndex];
                        if (typeof point === 'undefined') return;
                        if (typeof singlePoint === 'undefined') singlePoint = point;
                        if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                        allData.push({
                            key: series.key,
                            value: chart.y()(point, pointIndex),
                            color: color(series,series.seriesIndex)
                        });
                    });

                var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));
                interactiveLayer.tooltip
                    .position({left: pointXLocation + margin.left, top: e.mouseY + margin.top})
                    .chartContainer(that.parentNode)
                    .enabled(tooltips)
                    .valueFormatter(function(d,i) {
                        return yAxis.tickFormat()(d);
                    })
                    .data(
                    {
                        value: xValue,
                        series: allData
                    }
                )();

                interactiveLayer.renderGuideLine(pointXLocation);

            });

            interactiveLayer.dispatch.on("elementMouseout",function(e) {
                dispatch.tooltipHide();
                lines.clearHighlights();
            });

            dispatch.on('tooltipShow', function(e) {
                if (tooltips) showTooltip(e, that.parentNode);
            });


            dispatch.on('changeState', function(e) {

                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                chart.update();
            });

            chart.playTimer = null;

            chart.play = function(){

                clearTimeout(chart.playTimer);
                chart.playTimer = null;

                var brushStep = step(x.domain(),data[0].values);
                var end  = x.domain()[1];

                if( brush.empty() || brushExtent === null){
                    brushExtent = [ x.domain()[0], x.domain()[0]+(playMode?brushStep:initStep(brushStep)) ];
                }
                if( brushExtent[1] >= end ){
                    brushExtent = playMode?[ brushExtent[0], brushExtent[0] ]:[ x.domain()[0], x.domain()[0] + brushExtent[1]- brushExtent[0] ];
                }

                var playstep = function(){
                    if( brushExtent === null || brushExtent[1] === end ){
                        clearTimeout(chart.playTimer);
                        chart.playTimer = null;
                        setTimeout(function(){
                            dispatch.stopPlay({brush:brush,extent:brush.extent()});
                            dispatch.finishPlay({brush:brush,extent:brush.extent()});
                        },0);
                        return;
                    }
                    if(brushExtent[1] + brushStep >= end){
                        brushStep =  end - brushExtent[1];
                    }else{
                        brushStep = step(x.domain(),data[0].values);
                    }
                    brushExtent = [ playMode?brushExtent[0]:brushExtent[0]+=brushStep , brushExtent[1]+=brushStep ];
                    brush.extent(brushExtent);
                    gBrush.call(brush);
                    onBrush();
                    chart.playTimer = setTimeout(playstep,transitionDuration+1);
                }

                dispatch.startPlay({brush:brush,extent:brush.extent()});
                playstep();
            }

            chart.stop = function(){
                clearTimeout(chart.playTimer);
                chart.playTimer = null;
                dispatch.stopPlay({brush:brush,extent:brush.extent()});
            }

            //============================================================

        });

        return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
    });

    lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
    });

    dispatch.on('tooltipHide', function() {
        if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.lines = lines;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;

    d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale',
        'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id', 'interpolate','highlightPoint','clearHighlights', 'interactive');

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.brush = brush;

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
        margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
        margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
        margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
        return chart;
    };

    chart.width = function(_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.color = function(_) {
        if (!arguments.length) return color;
        color = nv.utils.getColor(_);
        legend.color(color);
        return chart;
    };

    chart.brushExtent = function(_){
        if (!arguments.length) return brushExtent;
        brushExtent = _;
        return chart;
    }

    chart.showLegend = function(_) {
        if (!arguments.length) return showLegend;
        showLegend = _;
        return chart;
    };

    chart.showXAxis = function(_) {
        if (!arguments.length) return showXAxis;
        showXAxis = _;
        return chart;
    };

    chart.showYAxis = function(_) {
        if (!arguments.length) return showYAxis;
        showYAxis = _;
        return chart;
    };

    chart.rightAlignYAxis = function(_) {
        if(!arguments.length) return rightAlignYAxis;
        rightAlignYAxis = _;
        yAxis.orient( (_) ? 'right' : 'left');
        return chart;
    };

    chart.useInteractiveGuideline = function(_) {
        if(!arguments.length) return useInteractiveGuideline;
        useInteractiveGuideline = _;
        if (_ === true) {
            chart.interactive(false);
            chart.useVoronoi(false);
        }
        return chart;
    };

    chart.tooltips = function(_) {
        if (!arguments.length) return tooltips;
        tooltips = _;
        return chart;
    };

    chart.tooltipContent = function(_) {
        if (!arguments.length) return tooltip;
        tooltip = _;
        return chart;
    };

    chart.step = function(_) {
        if (!arguments.length) return step;
        step = _;
        return chart;
    };

    chart.initStep = function(_) {
        if (!arguments.length) return initStep;
        initStep = _;
        return chart;
    };

    chart.state = function(_) {
        if (!arguments.length) return state;
        state = _;
        return chart;
    };

    chart.defaultState = function(_) {
        if (!arguments.length) return defaultState;
        defaultState = _;
        return chart;
    };

    chart.noData = function(_) {
        if (!arguments.length) return noData;
        noData = _;
        return chart;
    };

    chart.transitionDuration = function(_) {
        if (!arguments.length) return transitionDuration;
        transitionDuration = _;
        return chart;
    };

    chart.playMode = function(_){
        if (!arguments.length) return playMode;
        playMode = _;
        return chart;
    }

    chart.showBrushExtentLabel = function(_){
        if (!arguments.length) return showBrushExtentLabel;
        showBrushExtentLabel = _;
        return chart;
    }

    //============================================================


    return chart;
}
