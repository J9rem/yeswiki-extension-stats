/*
 * This file is part of the YesWiki Extension stats.
 *
 * Authors : see README.md file that was distributed with this source code.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import SpinnerLoader from '../../bazar/presentation/javascripts/components/SpinnerLoader.js'

let rootsElements = ['.stats-container'];
let isVueJS3 = (typeof Vue.createApp == "function");

let appParams = {
    components: { SpinnerLoader},
    data: function() {
        return {
            dataTable: null,
            dOMContentLoaded: false,
            loading: false,
            message: "",
            messageClass: {alert:true,'alert-info':true},
            ready: false,
            stats:{}, 
        };
    },
    methods: {
        loadStats: function(){
            let app = this;
            if (app.loading){
                return ;
            }
            app.message = _t('STATS_LOADING');
            app.messageClass = {alert:true,'alert-info':true};
            app.loading = true;
            $.ajax({
                method: "GET",
                url: wiki.url(`api/triples`),
                data: {
                    property: 'https://yeswiki.net/vocabulary/stats',
                },
                success: function(data){
                    let dataAsArray = {};
                    if (Array.isArray(data)){
                        dataAsArray = data;
                    } else if (typeof data == "object"){
                        data.forEach((stat) => dataAsArray.push(stat));
                    }
                    app.stats = dataAsArray;
                    app.message = _t('STATS_LOADED');
                    app.messageClass = {alert:true,['alert-success']:true};
                    app.loading = false;
                    if (app.dOMContentLoaded){
                        app.pushDataToTable();
                    } else {
                        document.addEventListener('DOMContentLoaded', () => {
                            app.pushDataToTable();
                        });
                    }
                },
                error: function(xhr,status,error){
                    app.message = _t('STATS_LOADING_ERROR');
                    app.messageClass = {alert:true,['alert-danger']:true};
                    app.loading = false;
                },
                complete: function(){
                    app.ready = true;
                }
            });
        },
        pushDataToTable: function(){
            let app = this;
            if (app.loading){
                return ;
            }
            let d = new Date();
            let currentYear = d.getFullYear();
            let currentMonth = d.getMonth()+1;
            this.dataTable = $(this.$refs.dataTable).DataTable({
                ...DATATABLE_OPTIONS,
                ...{
                    data: app.convertForTable(app.getFormattedData()),
                    columns: [
                        {
                            data:"name",
                            title:_t('STATS_TAG'),
                            render: function ( data, type, row, meta ) {
                                return `<a class="modalbox" data-iframe="1" data-size="modal-lg" href="${wiki.url(data+'/iframe')}" title="${data}">${data}</a>`;
                            }
                        },
                        {data:"visits",title:_t('STATS_VISITS')},
                        {data:"visitors",title:_t('STATS_VISITORS')},
                        {data:"currentYearVisits",title:_t('STATS_YEAR_VISITS',{year:currentYear})},
                        {data:"currentYearVisitors",title:_t('STATS_YEAR_VISITORS',{year:currentYear})},
                        {data:"currentMonthVisits",title:_t('STATS_MONTH_VISITS',{year:currentYear%100,month:((currentMonth<10)?"0":"")+currentMonth})},
                        {data:"currentMonthVisitors",title:_t('STATS_MONTH_VISITORS',{year:currentYear%100,month:((currentMonth<10)?"0":"")+currentMonth})},
                        {data:"previousMonthVisits",title:_t('STATS_MONTH_VISITS',{year:(((currentMonth==1)?-1:0)+currentYear)%100,month:(currentMonth==1)?12:(((currentMonth<11)?"0":"")+(currentMonth-1))})},
                        {data:"previousMonthVisitors",title:_t('STATS_MONTH_VISITORS',{year:(((currentMonth==1)?-1:0)+currentYear)%100,month:(currentMonth==1)?12:(((currentMonth<11)?"0":"")+(currentMonth-1))})},
                    ]
                },
                order:[
                    [1,'desc'],
                    [2,'desc'],
                    [0,'desc'],
                ]
            });
        },
        getFormattedData: function(){
            let app = this;
            let data = {};
            if (app.loading){
                return data;
            }
            app.stats.forEach((stat)=>{
                data[stat.resource] = {
                    values:JSON.parse(stat.value)
                };
                data[stat.resource] = app.appendTotalVisits(data[stat.resource]);
            });
            return data;
        },
        convertForTable: function(formattedData){
            let app = this;
            let data = [];
            if (app.loading){
                return data;
            }
            Object.keys(formattedData).forEach((tag)=>{
                let stat = formattedData[tag];
                data.push({
                    name:tag,
                    visits:stat.visits,
                    visitors:stat.visitors,
                    currentYearVisits:stat.currentYear.visits,
                    currentYearVisitors:stat.currentYear.visitors,
                    currentMonthVisits:stat.currentMonth.visits,
                    currentMonthVisitors:stat.currentMonth.visitors,
                    previousMonthVisits:stat.previousMonth.visits,
                    previousMonthVisitors:stat.previousMonth.visitors,
                });
            });

            return data;
        },
        appendTotalVisits: function(stat){
            if (typeof stat != "object"){
                return {};
            }
            let keys = {
                v:'visits',
                s:'visitors'
            };
            let totalVisits = {s:0,v:0};
            let d = new Date();
            let currentYear = parseInt(d.getFullYear());
            let currentMonth = parseInt(d.getMonth())+1;
            let thisYearVisits = {s:0,v:0};
            let thisMonthVisits = {s:0,v:0};
            let previousMonthVisits = {s:0,v:0};
            for (const year in stat.values) {
                let intYear = parseInt(year);
                if (intYear > 2000 && intYear < 3000 && typeof stat.values[year] == "object") {
                    for (const month in stat.values[year]) {
                        let intMonth = parseInt(month);
                        if (intMonth > 0 && intMonth < 13 && typeof stat.values[year][month] == "object") {
                            Object.keys(keys).forEach((key)=>{
                                if (stat.values[year][month][key] != undefined){
                                    totalVisits[key] = totalVisits[key] + stat.values[year][month][key];
                                    if (intYear == currentYear ){
                                        thisYearVisits[key] = thisYearVisits[key] + stat.values[year][month][key];
                                        if (intMonth == currentMonth ){
                                            thisMonthVisits[key] = thisMonthVisits[key] + stat.values[year][month][key];
                                        } else if (intMonth == (currentMonth-1)){
                                            previousMonthVisits[key] = previousMonthVisits[key] + stat.values[year][month][key];
                                        }
                                    } else if (currentMonth == 1 && intYear == (currentYear-1) && intMonth == 12){
                                        previousMonthVisits[key] = previousMonthVisits[key] + stat.values[year][month][key];
                                    }
                                }
                            });
                        }
                    }
                }
            }
            stat.currentYear = {}
            stat.currentMonth = {}
            stat.previousMonth = {}
            Object.keys(keys).forEach((key)=>{
                stat[keys[key]] = totalVisits[key];
                stat.currentYear[keys[key]] = thisYearVisits[key];
                stat.currentMonth[keys[key]] = thisMonthVisits[key];
                stat.previousMonth[keys[key]] = previousMonthVisits[key];
            });
            return stat;
        }
    },
    mounted(){
        $(isVueJS3 ? this.$el.parentNode : this.$el).on('dblclick',function(e) {
          return false;
        });
        document.addEventListener('DOMContentLoaded', () => {
            this.dOMContentLoaded = true;
        });
        this.loadStats();
    }
};

if (isVueJS3){
    let app = Vue.createApp(appParams);
    app.config.globalProperties.wiki = wiki;
    app.config.globalProperties._t = _t;
    rootsElements.forEach(elem => {
        app.mount(elem);
    });
} else {
    Vue.prototype.wiki = wiki;
    Vue.prototype._t = _t;
    rootsElements.forEach(elem => {
        new Vue({
            ...{el:elem},
            ...appParams
        });
    });
}