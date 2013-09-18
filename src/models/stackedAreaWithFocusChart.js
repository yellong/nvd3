nv.models.stackedAreaWithFocusChart = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var area = nv.models.stackedAreaChart()
        , column = nv.models.historicalBarChart()
        , brush = d3.svg.brush()
        , dispatch = d3.dispatch('brush')
        , noData = "No Data Available."
        , color = nv.utils.defaultColor()
        , color2 = nv.utils.defaultColor()
        , margin_area = {top: 30, right: 30, bottom: 20, left: 80}
        , margin_column = {top: 0, right: 30, bottom: 20, left: 80}
        , width = null
        , height = null
        , height_area = null
        , height_column = 100
        , brushExtent = null;

//    area.showControls(false);
    area.useInteractiveGuideline(true);
    area.controls.key(function (d) {
        var mapping = {
            "Stacked": "堆积图",
            "Stream": "流线图",
            "Expanded": "比例图"
        };
        return mapping[d.key];
    });


    column
        .tooltipContent(function () {
            return "";
    });

    //确保column柱状图一种颜色
    column.color(function () {
        return color2({}, 0)
    });

    var prepareData = function (data) {

        var column_data  = {key:"default",values:[]};

        var getX = area.stacked.x();
        var getY = area.stacked.y();

        data[0].values.forEach(function(v,i){
            column_data.values[i] = {
                x : getX(v),
                y : data.reduce(function(m,group){return m+ getY(group.values[i])},0)
            }
        });

        return {
            area:data,
            column:[column_data]
        };
    };

    //appendBrush 方法依赖外部的 brush、dispatch、brushExtent 三个变量
    var appendBrush = function (chart, options) {

        var target = d3.select(chart.container).select("g.nv-wrap");
        //添加初始化的图形
        target.select('g').append('g').attr('class', 'nv-brushBackground');
        target.select('g').append('g').attr('class', 'nv-x nv-brush');

        var brushHeight = options.height - chart.margin().top - chart.margin().bottom || target[0][0].getBoundingClientRect().height;

        //获取chart的横坐标变换
        var xScale = chart.xScale();

        function updateBrushBG() {
            if (!brush.empty()) brush.extent(brushExtent);
            brushBG
                .data([brush.empty() ? xScale.domain() : brushExtent])
                .each(function (d) {
                    //leftWidth 和 rightWidth 会有精度问题，在页面上会显示出一条灰线
                    var leftWidth = xScale(d[0]) - xScale.range()[0],
                        rightWidth = xScale.range()[1] - xScale(d[1]);
                    d3.select(this).select('.left')
                        .attr('width', leftWidth < 1 ? 0 : leftWidth);
                    d3.select(this).select('.right')
                        .attr('x', xScale(d[1]))
                        .attr('width', rightWidth < 1 ? 0 : rightWidth);
                });
        }

        function onBrush(option) {
            brushExtent = brush.empty() ? null : brush.extent();
            option.extent = brush.empty() ? xScale.domain() : brush.extent();
            option.brush = brush;
            dispatch.brush(option);
            updateBrushBG();
        }

        function resizePath(d) {
            var e = +(d == 'e'),
                x = e ? 1 : -1,
                y = brushHeight / 3;
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

        brush.x(xScale).on('brush', onBrush);

        if (brushExtent) brush.extent(brushExtent);

        var brushBG = target.select('.nv-brushBackground').selectAll('g').data([brushExtent || brush.extent()]);
        var brushBGenter = brushBG.enter().append('g');

        brushBGenter.append('rect')
            .attr('class', 'left')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', brushHeight);

        brushBGenter.append('rect')
            .attr('class', 'right')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', brushHeight);

        var gBrush = target.select('.nv-x.nv-brush')
            .call(brush);
        gBrush.selectAll('rect')
            .attr('height', brushHeight);
        gBrush.selectAll('.resize').append('path').attr('d', resizePath);

        updateBrushBG();

        brush.update = function (option) {
            var extent = option && option.extent;
            extent && brush.extent(extent);
            target.select('.nv-x.nv-brush').call(brush);
            if(option===undefined || option===null)option = {}
            option.silent = option.silent || true;
            onBrush(option);
        };

        return brush;
    };

//    var showTooltip = function (e, offsetElement) {
//        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
//            top = e.pos[1] + ( offsetElement.offsetTop || 0),
//            x = area.xAxis.tickFormat()(area.x()(e.point, e.pointIndex)),
//            y = area.yAxis.tickFormat()(area.y()(e.point, e.pointIndex)),
//            content = area.tooltipContent()(e.series.key, x, y, e, chart);
//
//        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null);
//    };

    var chart = function (selection) {
        selection.each(function (data) {
            var container = d3.select(this);

            var availableWidth = (width || parseInt(container.style('width')) || 960),
                availableHeight_area = (height_area || parseInt(container.style('height')) || 400) - margin_area.top - margin_area.bottom - height_column,
                availableHeight_column = height_column - margin_column.top - margin_column.bottom;

            chart.update = function () {
                container.transition().call(chart)
            };
            chart.container = this;

            area.width(availableWidth)
                .height(availableHeight_area)
                .margin(margin_area)
                .noData(noData);
            column.width(availableWidth)
                .height(availableHeight_column)
                .margin(margin_column)
                .noData(noData);

            var data_prepared = prepareData(data);

            var wrap = container.selectAll('g.nv-wrap.nv-stackedAreaWithFocusChart').data([data_prepared]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-stackedAreaWithFocusChart').append('g');

            var focusEnter = gEnter.append('g').attr('class', 'nv-focus');

            var contextEnter = gEnter.append('g').attr('class', 'nv-context');
            contextEnter.attr('transform', 'translate( 0 ,' + ( availableHeight_area + margin_area.bottom + margin_column.top) + ')');

            var context = container.select(".nv-context").datum(data_prepared.column).transition().duration(1200).call(column);

            appendBrush(column, {height: availableHeight_column});

            var disableEvent = function () {
//                area.legend.dispatch.on("legendClick", null);
//                area.legend.dispatch.on("legendDblclick", null);
//                area.legend.dispatch.on("legendMouseover", null);
//                area.legend.dispatch.on("legendMouseout", null);
//                focusEnter.selectAll(".nv-legendWrap .nv-legend .nv-series").style("cursor", "auto");
//                area.stacked.dispatch.on("areaClick.toggle", null);
            };

            var onBrush = function (brush_data) {
                var extent = brush_data.extent;
                var focus = d3.select(chart.container).select('g.nv-focus').datum(
                    data_prepared.area.filter(function (d) {
                        return !d.disabled
                    }).map(function (d) {
                            return {
                                key: d.key,
                                values: d.values.filter(function (d, i) {
                                    return area.x()(d, i) >= extent[0] && area.x()(d, i) <= extent[1];
                                })
                            }
                        })
                );
                focus.transition().duration(0).call(area);
                //disableEvent();
//                area.dispatch.on('tooltipShow', function (e) {
//                    showTooltip(e, that.parentNode);
//                });
            };
            dispatch.on("brush", onBrush);
            onBrush({extent: column.xScale().domain(), brush: brush});
        });
        return chart;
    };

    chart.dispatch = dispatch;
    chart.legend = area.legend;
    chart.controls = area.controls;
    chart.showControls = area.showControls;
    chart.showLegend = area.showLegend;
    chart.xAxis = area.xAxis;
    chart.yAxis = area.yAxis;
    chart.xAxis2 = column.xAxis;
    chart.yAxis2 = column.yAxis;
    chart.tooltipContent = area.tooltipContent;
    chart.brush = brush;

    chart.x = function (_) {
        if (!arguments.length) return area.x;
        area.x(_);
        return chart;
    };

    chart.y = function (_) {
        if (!arguments.length) return area.y;
        area.y(_);
        return chart;
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin_area;
        margin_area.top = typeof _.top != 'undefined' ? _.top : margin_area.top;
        margin_area.right = typeof _.right != 'undefined' ? _.right : margin_area.right;
        margin_area.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin_area.bottom;
        margin_area.left = typeof _.left != 'undefined' ? _.left : margin_area.left;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.color = function (_) {
        if (!arguments.length) return color;
        color = nv.utils.getColor(_);
        area.color(color);
        return chart;
    };

    chart.color2 = function (_) {
        if (!arguments.length) return color2;
        color2 = nv.utils.getColor(_);
        column.color(color2);
        return chart;
    };

    chart.noData = function (_) {
        if (!arguments.length) return noData;
        noData = _;
        return chart;
    };

    return chart;
};
