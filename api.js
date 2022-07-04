const express =  require('express');
const async = require('async');
const bodyParser = require('body-parser');
var logger = require('morgan');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));

const port = 3000;

app.get('/split-payments/compute', (req, res) => {
    const in_json = req.body;
    response_out = {"ID": in_json.ID,
                "Balance": in_json.Amount,
                "SplitBreakdown": []
    }

    flatProcessor(in_json, response_out);
    percentProcessor(in_json, response_out);
    ratioProcessor(in_json, response_out);
    //async.waterfall
    console.log(response_out);
    //console.log(in_json.SplitInfo[0]);
    res.send(`Hello World, from express, ${req.body.ID}`);
});


function flatProcessor(request, response_out) {
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
}

function percentProcessor(request, response_out) {
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
}


function ratioProcessor(request, response_out) {
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

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`))