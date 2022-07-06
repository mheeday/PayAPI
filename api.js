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

var port = normalizePort(process.env.PORT || '8081');
app.set('port', port);

const reducer = (accumulator, curr) => accumulator + curr;

app.post('/split-payments/compute', (req, res) => {
    res.setHeader('Content-Type', 'application/json')

    async.parallel(
        [
            function (callback) {
                if (!Object.keys(req.body).length) {
                    callback("Empty Body");
                }
            },

            function (callback) {
                if (!Object.keys(req.body).length) {
                    callback("Empty Body");
                }
            },

            function (callback) {
                if (!Object.keys(req.body).length) {
                    callback("Empty Body");
                }
            },

            function (callback) {
                if (! (Object.keys(req.body).length == 5)) {
                    if (!req.body.ID) {
                        callback("ID missing");
                    }
                    else if (!req.body.Amount) {
                        callback("Amount missing");
                    }
                    else if (!req.body.Currency) {
                        callback("Currency missing");
                    }
                    else if (!req.body.CustomerEmail) {
                        callback("Customer Email missing");
                    }
                    else if (!req.body.SplitInfo) {
                        callback("SplitInfo  missing");
                    }
                }
            },

            function (callback) {
                if (req.body.SplitInfo.length == 0 ||  req.body.SplitInfo.length > 20 ) {
                    callback("SplitInfo  is either empty or more than 20");
                }
            },

            function (callback) {
                if (req.body.SplitInfo.length) {
                    const TYPEARRAY = ['FLAT', 'PERCENTAGE', 'RATIO'];
            
                    for (let ele of req.body.SplitInfo)
                    {   
                         if (!(TYPEARRAY.includes(ele['SplitType'])) || typeof ele["SplitValue"] != 'number') {
                            callback("SplitInfo objects has invalid splittype or splitvalue");
                        } 
            
                        else if (Object.keys(ele).length != 3) {
                        callback("Length of splitInfo objects are invalid")
                        };
                    }
                }
            },

            function (callback) {
                if (typeof req.body.ID != 'number' || typeof req.body.Amount != 'number') {
                    callback("ID or Amount isn't a nummber ");
                }
            } 
        ],
            function(err, result) {
                if (err) {
                    return res.status(406).send(err)
                }
            }
    )

    in_json = req.body;
    in_json["percent_arr"] = []
    in_json["ratio_arr"] = []
    in_json['total_ratio'] = 0;

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
            if (err) {return res.status(400).send(err);}
            if (response_out.Balance < 0 || response_out.Balance < response_out.SplitBreakdown.reduce(reducer)) {
                return res.status(400).send("Split info is wrong")
            }
            return res.status(200).json(response_out);            
        })
    
});

function flatProcessor(request, response_out, callback) {
    let error = false;
    let balance = response_out.Balance;
    for (let split of request.SplitInfo) {
        if (split["SplitType"] =='FLAT') {
            let add_amount = split.SplitValue;
            if (add_amount < 0 || add_amount > balance || balance < 0) {
                callback("Error")
            }
            let temp_obj = {"SplitEntityId": split.SplitEntityId, "Amount": add_amount};
            response_out.SplitBreakdown.push(temp_obj)
            balance -= add_amount;
        }
        else if (split["SplitType"] =='PERCENTAGE') {
            request.percent_arr.push(split)
        }
        else {
            request.total_ratio += split.SplitValue;
            request.ratio_arr.push(split)
        }
    }
    response_out.Balance=balance;
    callback(null, request, response_out);
}

function percentProcessor(request, response_out, callback) {
    let balance = response_out.Balance;
    for (let split of request.percent_arr) {
        if (split["SplitType"] =='PERCENTAGE') {
            if (split.SplitValue > 100 || split.SplitValue < 1) {
                callback("Error");
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
    for (let split of request.ratio_arr) {
        if (split["SplitType"] =='RATIO') {
            let add_amount = ((split.SplitValue/request.total_ratio) * balance);
            let temp_obj = {"SplitEntityId": split.SplitEntityId, "Amount": add_amount};
            response_out.SplitBreakdown.push(temp_obj)
        }
    }
    if (request.total_ratio>0) { 
        response_out.Balance=0;
    }
    callback(null, request, response_out);
} 


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