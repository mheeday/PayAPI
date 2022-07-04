const express =  require('express');
const async = require('async');
const bodyParser = require('body-parser');
var logger = require('morgan');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));

const port = 3000;

app.post('/split-payments/compute', (req, res) => {
    const in_json = req.body;
    response_out = {"ID": in_json.ID,
                "Balance": in_json.Amount,
                "SplitBreakdown": []
    }

    async.waterfall([
        function(callback) {
            callback(null, in_json, response_out);
        },
        flatProcessor,
        percentProcessor,
        ratioProcessor
        ],
        function (err, result) {
            res.status(200).json(response_out)
            
        })
});


function flatProcessor(request, response_out, callback) {
    let balance = response_out.Balance;
    for (let split of request.SplitInfo) {
        if (split["SplitType"] =='FLAT') {
            let add_amount = split.SplitValue;
            let temp_obj = {"SplitEntityId": split.SplitEntityId, "Amount": add_amount};
            response_out.SplitBreakdown.push(temp_obj)
            balance -= add_amount;
        }
    }
    response_out.Balance=balance;
    callback(null, request, response_out);
}

function percentProcessor(request, response_out, callback) {
    let balance = response_out.Balance;
    for (let split of request.SplitInfo) {
        if (split["SplitType"] =='PERCENTAGE') {
            //console.log(split.SplitEntityId)
            let add_amount = ((split.SplitValue/100) * balance);
            let temp_obj = {"SplitEntityId": split.SplitEntityId, "Amount": add_amount};
            response_out.SplitBreakdown.push(temp_obj)
            balance -= add_amount;
        }
    }
    response_out.Balance=balance;
    callback(null, request, response_out);
}


function ratioProcessor(request, response_out, callback) {
    let balance = response_out.Balance;
    let totalRatio = 0;
    for (let split of request.SplitInfo) {
        if (split["SplitType"] =='RATIO') {
            totalRatio += split.SplitValue;
        }
    }
    for (let split of request.SplitInfo) {
        if (split["SplitType"] =='RATIO') {
            let add_amount = ((split.SplitValue/totalRatio) * balance);
            let temp_obj = {"SplitEntityId": split.SplitEntityId, "Amount": add_amount};
            response_out.SplitBreakdown.push(temp_obj)
        }
    }
    if (totalRatio>0) { 
        response_out.Balance=0;
    }
    callback(null, request, response_out);
} 




// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
  });
  
  // error handler
/*   app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  }); */

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));

//rew.accepts
//res.set
//res.type
