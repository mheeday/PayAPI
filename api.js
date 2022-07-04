const express =  require('express');
const async = require('async');
const bodyParser = require('body-parser');
var logger = require('morgan');
var compression = require('compression');

const app = express();

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({
        type: function() {
            return true;
        }
    })
    );

app.use(logger('dev'));

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const reducer = (accumulator, curr) => accumulator + curr;

app.post('/split-payments/compute', (req, res) => {
    res.setHeader('Content-Type', 'application/json')

    if (!Object.keys(req.body).length) {
        return res.status(400).send("Empty Body");
    }

    else if (! (Object.keys(req.body).length == 5)) {
        if (!req.body.ID) {
            return res.status(406).send("ID missing");
        }
        else if (!req.body.Amount) {
            return res.status(406).send("Amount missing");
        }
        else if (!req.body.Currency) {
            return res.status(406).send("Currency missing");
        }
        else if (!req.body.CustomerEmail) {
            return res.status(406).send("Customer Email missing");
        }
        else {
            return res.status(411).send("SplitInfo  missing");
        }
    }

    else if (req.body.SplitInfo.length == 0 ||  req.body.SplitInfo.length > 20 ) {
        return res.status(406).send("SplitInfo  is either empty or more than 20");
    }

    else if (req.body.SplitInfo.length) {
        const TYPEARRAY = ['FLAT', 'PERCENTAGE', 'RATIO'];

        for (let ele of req.body.SplitInfo)
        {   
             if (!(TYPEARRAY.includes(ele['SplitType'])) || typeof ele["SplitValue"] != 'number') {
                return res.status(406).send("SplitInfo objects has invalid splittype or splitvalue");
            } 

            if (Object.keys(ele).length != 3) {
            return res.status(406).send("Length of splitInfo objects are invalid")
            };
        }
    }

    else if (typeof req.body.ID != 'number' || typeof req.body.Amount != 'number') {
        return res.status(406).send("ID or Amount isn't a nummber ");
    }

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
        function (err) {
            // The split Amount value computed for each entity cannot be greater than the transaction Amount.
            // The split Amount value computed for each entity cannot be lesser than 0.0
            if (err) {return res.status(400);}
            if (response_out.Balance < 0 || response_out.Balance < response_out.SplitBreakdown.reduce(reducer)) {
                return res.status(400).send("Split info is wrong")
            }
            return res.status(200).json(response_out);            
        })
    
});

function flatProcessor(request, response_out, callback) {
    let max_amt = request.Amount;
    let balance = response_out.Balance;
    for (let split of request.SplitInfo) {
        if (split["SplitType"] =='FLAT') {
            let add_amount = split.SplitValue;
            if (add_amount > max_amt || add_amount < 0) {
                callback(1);
            }
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
            if (split.SplitValue > 100 || split.SplitValue < 1) {
                callback(1);
            }
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
/* app.use(function(req, res, next) {
    return res.status(404);
  }); */
  

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));

function normalizePort(val) {
    var port = parseInt(val, 10);
  
    if (isNaN(port)) {
      // named pipe
      return val;
    }
  
    if (port >= 0) {
      // port number
      return port;
    }
  
    return false;
  }