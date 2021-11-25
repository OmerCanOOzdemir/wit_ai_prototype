const express = require("express");
const app = express();
let fetch = require("node-fetch");
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/webhook", (req, res) => {
  // the webhook GET route checks the query of the webhook route
  // to see if the hub.verify_token parameter is equal to the same
  // callback token set on the facebook app dashboard
  // this is a security check

  console.log(req.query);
  if (req.query["hub.verify_token"] === "prototype") {
    res.send(req.query["hub.challenge"]);
  } else {
    res.send("Error, wrong validation token");
  }
});

app.post("/webhook", async (req, res) => {
  // extracts the message sent from the messenger application
  let [message] = req.body.entry[0].messaging;
  console.log(req.body.entry[0].messaging);
  //sends a GET request to the wit.ai platform
  let get = `https://api.wit.ai/message?v=20211114&q=${message.message.text}`;
  let answer = await fetch(encodeURI(get), {
    headers: {
      Authorization: `Bearer ${process.env["witAPI"]}`
    }
  });
  let wit = await answer.json();
  //tries to ensure that property to extract the value from the wit.ai response exists
  let response_message_wit;
  
  if (wit.entities && wit.entities["film:film"]) {
    
    //Link to the film api
    let link = `http://www.omdbapi.com/?apikey=${process.env["filmAPI"]}&t=${wit.entities["film:film"][0].value}&plot=full`;
    //console.log(link);
    //AJAX call to the API 
    let fetchData = await fetch(encodeURI(link));
    let data = await fetchData.json();
    console.log(data);
    if (data.Response == "False") {
      response_message_wit = "Film not found, try again";
    } else {
      response_message_wit = `Title: ${data.Title} \n Released: ${data.Year} \n Plot: ${data.Plot} \n Poster: ${data.Poster}`;
    }
  }else{
    response_message_wit = "Sorry you give a wrong sentence. Give sentence like 'Give me information about Joker'";
  }
  
  // obtain the sender id from message object 
  let body = {
    recipient: {
      id: message.sender.id
    },
    message: {
      text: response_message_wit
    }
  };

/*sends a response containing information from the film API
back to the user on Messenger */
  try {
    let ans = await fetch('https://graph.facebook.com/v8.0/me/messages?access_token='+process.env["facebookAPI"], {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    });
    let res = await ans.json();
    //console.log(res);
  } catch (e) {
    console.log("error", e);
  }
  res.send();
});

// listen for requests
const listener = app.listen(process.env.PORT, () => {
  console.log("App listening on port: " + listener.address().port);
});

