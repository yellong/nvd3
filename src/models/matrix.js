
nv.models.matrix = function() {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = null,
        height = null,

        xCellCount = null,
        cellCount = null,
        cellPaddding = 6,
        cellWidth = 28,
        cellRound = 2,

        x = function(d,i){return (i%xCellCount) * (cellWidth+cellPaddding)},
        y = function(d,i){return Math.floor( i/xCellCount ) * (cellWidth+cellPaddding) },
        color = d3.scale.ordinal().range(colorbrewer.YlGn[6]),

        getKey = function(d,i) { return d.key } ,
        getColor = function(d,i) { return d.color } ,
        disabled = function(d,i) { return d.color === 0},

        transitionDuration = 300,

        tooltipContent = function(skey,key,color,e,chart){
            return "<h3>"+key+"</h3><p>"+color+"</p>";
        },

        legend = nv.models.legend(),

        showLabel = false,
        disabledColor = '#ccc',

        dispatch = d3.dispatch('tooltipShow','tooltipHide','elementMouseover','elementMouseout','elementClick','stateChange', 'changeState');

    var prepareData = function(data){
        return d3.merge(
            data.map(function(d,s) {
                return d.values.map(function(d,i) {
                    return {
                        key: getKey(d,i),
                        color: getColor(d,i),
                        x: x(d,i),
                        y: y(d,i),
                        series: s
                    }
                })
            })
        );
    }

    var showTooltip = function(e, offsetElement){
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            key = getKey(e.point, e.pointIndex),
            color = getColor(e.point, e.pointIndex),
            content = tooltipContent(e.series.key, key, color, e, chart);

        nv.tooltip.show([left, top], content, null, null, offsetElement);
    }

    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this),
                that = this,
                availableWidth = (width||parseInt(container.style('width'))||900)  - margin.left - margin.right,
                availableHeight = (height||parseInt(container.style('height'))||500) - margin.top - margin.bottom;

            xCellCount = Math.floor( availableWidth / (cellWidth+cellPaddding) );
            cellCount = data[0].values.length;

            //------------------------------------------------------------
            // Setup Scales


            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup containers and skeleton of chart

            var prepared_data = prepareData(data);

            var wrap = container.selectAll('g.nv-wrap.nv-matrix').data([prepared_data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-matrix');
            var gEnter = wrapEnter.append('g').data(function(d){return d});
            var g = wrap.select('g');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var cells =  gEnter.selectAll('rect.nv-cell').data(function(d){return d})
            cells.enter().append('rect').attr('class','nv-cell');
            cells.exit().remove();
            cells.transition( transitionDuration )
                .attr('x',function(d){return  d.x;})
                .attr('y',function(d){return  d.y;})
                .attr('rx',cellRound).attr('ry',cellRound)
                .attr('width',cellWidth).attr('height',cellWidth)
                .style('fill',function(d,i){return disabled(d,i) ? disabledColor : color(d.color)});

            cells.on('click', function(d,i) {
                    if (!data[d.series]) return 0;
                    var series = data[d.series],
                        point  = series.values[i];
                    dispatch.elementClick({
                        point: point,
                        series: series,
                        pos: [x(point,i) + margin.left, y(point, i) + margin.top],
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                })
                .on('mouseover', function(d,i) {
                    if (!data[d.series]) return 0;
                    var series = data[d.series],
                        point  = series.values[i];
                    d3.select(d3.event.target).classed('hover',true);
                    dispatch.elementMouseover({
                        point: point,
                        series: series,
                        pos: [x(point,i) + margin.left + cellWidth/2, y(point, i) + margin.top + cellWidth/2],
                        seriesIndex: d.series,
                        pointIndex: i
                    });

                })
                .on('mouseout', function(d,i) {
                    if (!data[d.series]) return 0;
                    var series = data[d.series],
                        point  = series.values[i];
                    d3.select(d3.event.target).classed('hover',false);
                    dispatch.elementMouseout({
                        point: point,
                        series: series,
                        pos: [x(point,i) + margin.left, y(point, i) + margin.top],
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                })

            if(showLabel){
                gEnter.selectAll('text').data(function(d){return d}).enter().append('text')
                    .text(function(d){return d.key})
                    .attr('x',function(d){return  d.x+cellWidth/2;})
                    .attr('y',function(d){return  d.y+cellWidth/2;})
            }

            dispatch.on('elementMouseover.tooltip',function(e){
                dispatch.tooltipShow(e);
            });

            dispatch.on('elementMouseout.tooltip',function(e){
                dispatch.tooltipHide(e);
            });

            dispatch.on('tooltipShow',function(e){
                showTooltip(e,that.parentNode);
            });

            dispatch.on('tooltipHide',function(e){
                nv.tooltip.cleanup();
            });



        });



        return chart;
    }




    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------


    chart.dispatch = dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.tooltipContent = function(_){
        if (!arguments.length) return tooltipContent;
        tooltipContent = _;
        return chart;
    }

    chart.getKey = function(_){
        if (!arguments.length) return getKey;
        getKey = _;
        return chart;
    }

    chart.getColor = function(_){
        if (!arguments.length) return getColor;
        getColor = _;
        return chart;
    }

    chart.transitionDuration = function(_){
        if (!arguments.length) return transitionDuration;
        transitionDuration = _;
        return chart;
    }

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
        color = nv.utils.getColor(_)
        return chart;
    };

    //============================================================


    return chart;
}
