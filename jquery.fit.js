/* 保存界面状态 */
$.lastStateSetting = {};
$.lastState = {
    register: function (id, group, get, save) {
        $('<span style="display:none"><span>').addClass('statestr').attr('id', 'statestr_' + id).appendTo('body').attr('group', group);
        $.lastStateSetting[id] = { group: group, get: get, save: save };
    },
    getGroupState: function (group) {
        var r = {};
        $('.statestr[group=' + group + ']').each(function () {
            var txt = $(this).text();
            r[$(this)[0].id.substring(9)] = txt ? JSON.parse(txt) : null;
        }
        );
        return r;
    },
    change: function (id) {
        var state = $.lastStateSetting[id];

        //这里用了一个巧妙的方法, 延时0.5秒执行, 并只执行最后那一次
        $('#statestr_' + id).text(JSON.stringify(state.get()));

        var groupstatetxt = JSON.stringify($.lastState.getGroupState(state.group));

        setTimeout(function () {
            var groupstate = $.lastState.getGroupState(state.group);
            if (JSON.stringify(groupstate) == groupstatetxt) {
              //  if (console) console.log(groupstate);
                if ($.lastStateSetting[id].save) $.lastStateSetting[id].save(groupstate);
            }
        }, 500);

    }
}

$.fn.waitting = function (option) {
    option = $.extend({}, option);
    return this.each(function () {
        if (option.show) {
            $(this).show().next("a.waitting").remove();
        }
        else if (option.error) {
            var obj = $(this);
            obj.next("a.waitting").addClass("error").click(function () {
                $("<div class='waittingError'>").html(option.error.responseText).appendTo('body').dialog({
                    modal: true,
                    width: $(window).width() * 0.75,
                    height: $(window).height() * 0.75,
                    close: function () { $(".waittingError").remove(); }
                });
                $(this).remove();
                obj.show();
            });
        } else {
            $(this).hide();
            $("<a>").addClass("waitting").insertAfter(this);
        }

    });
}

$.fn.getpost = function (option) {
    option = $.extend({}, option);
    return this.each(function () {
        var btn = $(this);
        btn.click(function () {
            var con = $(this).attr("confirm");
            if (con && !confirm(con)) return false;

            var form = option.form ? option.form : btn.closest('form');
            var action = btn.attr('action');
            var href = $(this).attr('href');
            if (!action && href) {
                window.location = href;
                return false;
            }
            else if (!option.ajax) {
                form[0].submit();
                return false;
            }
            var rel = btn.attr('rel');
            btn.waitting();
            $.ajax(action, { data: form.serializeArray(), type: "post" }).done(function (data) {
                if (typeof data == "string") {
                    var r = JSON.parse(data);
                    if (!r) r = { IsValid: !data };
                } else var r = data;

                if (r.IsValid) {
                    var url = rel ? rel : window.location.toString();
                    if (r.ReturnValues)
                        for (var i in r.ReturnValues)
                            url += (url.indexOf("?") ? "&" : "?") + i + "=" + r.ReturnValues[i];
                    window.location = url;
                }
                else {
                    alert(_.map(r.Errors, function (i) { return i.ErrorMessage; }).join("\n"));
                    form.find("[name]").removeClass("error");
                    _.each(r.Errors, function (i) {
                        _.each(i.MemberNames, function (j) {
                            if (j.indexOf('.') > 0) j = "[name$=\"\[" + j.split('.')[1] + "\]." + j.split('.')[0] + "\"]";
                            else j = '[name=' + j + ']';
                            form.find(j).addClass("error");
                        });
                    });
                    btn.waitting({ show: true });
                }
            }).fail(function (jqXHR, ajaxSettings, thrownError) {
                console.log(jqXHR);
                btn.waitting({ error: jqXHR });
                alert(thrownError);
            });
            return false;
        });

    });
}

$.dic2array = function (data) {
    var result = [];
    for (var i in data) result.push({ key: i, value: data[i] });
    return result;
}

/**********  顺序执行n个函数 ****************/
var seq_async = function (funcs, callback) {
    this.funcs = funcs;
    this.callback = callback;
}

seq_async.prototype = {
    constructor: seq_async,
    execOne: function (params, index) {
        var obj = this;
        this.funcs[index](params, function (data) {
            if (arguments.length <= 1) data = data;
            else data = arguments;

            if (index == obj.funcs.length - 1)
                obj.callback(data);
            else obj.execOne(data, index + 1);
        })
    },
    exec: function () {
        this.execOne(null, 0);
    }
}

/**********  只执行一个函数，执行次数由数组决定     ***********/
var seq_asyncArray = function (func, paramsArray, callback) {
    this.func = func;
    this.paramsArray = paramsArray;
    this.callback = callback;
}


seq_asyncArray.prototype = {
    constructor: seq_asyncArray,
    execOne: function (params, index) {
        var obj = this;
        this.func(this.paramsArray[index], params, function (data) {
            if (arguments.length <= 1) data = data;
            else data = arguments;

            if (index == obj.paramsArray.length - 1) {
                if (obj.callback ) obj.callback(data);
            }
            else obj.execOne(data, index + 1);
        })
    },
    exec: function () {
        if (this.paramsArray.length > 0) this.execOne(null, 0);
        else this.callback(null);
    }
}