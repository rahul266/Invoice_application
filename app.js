const express=require("express");
const nodemailer=require("nodemailer");
const pdfmaker=require("pdfkit");
const fs = require('fs');
const ejs=require("ejs");
const bodyParser = require("body-parser");
const mongoose= require("mongoose");

const app=express()

mongoose.connect("mongodb://localhost:27017/invoiceDB", { useUnifiedTopology: true , useNewUrlParser:true},)

//using mongoDB database
const billsSchema={
    name: String,
    email: String,
    item: Array,
    itemcost: Array,
    itemquantity: Array,
    status: Array,
    notes:Array,
    dueDate: Array,
    dueAmount: Number,
    acountAmount: Number
}
const Bill=mongoose.model("bill", billsSchema);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));



app.get("/",(req,res)=>{
    res.render("home");
})

app.get("/data/:customerID",(req,res)=>{
    id=req.params.customerID
    Bill.findOne({name: id},function(err,foundData){
        res.render("Invoice",{name:foundData.name,item:foundData.item,itemcost:foundData.itemcost,itemquantity:foundData.itemquantity,status:foundData.status,dueAmount:foundData.dueAmount});
    })
})

app.get("/status/:customerID",(req,res)=>{
    id=req.params.customerID
    Bill.findOne({name:id},function(err,foundData){
        res.render("update.ejs",{name:id, item:foundData.item, itemcost:foundData.itemcost, itemquantity:foundData.itemquantity, status:foundData.status})
    })
    
})

app.get("/viewdata/:customerID",(req,res)=>{
    id=req.params.customerID
    Bill.findOne({name:id},function(err,foundData){
        res.render("viewdata.ejs",{name:id, item:foundData.item, itemcost:foundData.itemcost, itemquantity:foundData.itemquantity, status:foundData.status})
    })
})

app.post("/view",(req,res)=>{
    res.redirect("/viewdata/"+req.body.name)
})

// Gets the data of mentioned client and opens their database 
app.post("/home",(req,res)=>{
    i=req.body.name
    Bill.findOne({name:i},function(err,foundData){
        var a=[]
        var b=[]
        var c=[]
        if(err){
            console.log(err)
        }
        else{
        l=foundData.item.length
        a=(foundData.item)
        b=(foundData.itemcost)
        c=(foundData.itemquantity)
        s=foundData.status
        l=a.length
        a.push([])
        b.push([])
        c.push([])
        s.push("due")
        var ner = {
            item:a,
            itemcost:b,
            itemquantity:c,
            status:s
        }
        Bill.findOneAndUpdate({name:i},ner,function(err,res){
            console.log(err+"and"+res)
        })
        }
    })
    res.redirect("/data/"+req.body.name)
})

//creats a new client in data base
app.post("/new",(req,res)=>{
    const customer=new Bill({
        name: req.body.name,
        email: req.body.email,
        item: [[]],
        itemcost: [[]],
        itemquantity: [[]],
        status: ["due"],
        notes:[],
        dueDate: [],
        dueAmount: 0,
        acountAmount: 0
    });
    customer.save(function(err){
        if(err){
            console.log(err)
        }
        else{
            res.redirect("/data/"+req.body.name);
        }
    })
})


// to add items to the current invoice
app.post("/data/:customerId",async(req,res)=>{
    body=req.body
    i=req.params.customerId
    let a=[]
    let b=[]
    let c=[]
    Bill.findOne({name:i},function(err,foundData){
        if(err){
            console.log(err)
        }
        else{
        a=foundData.item
        b=foundData.itemcost
        c=foundData.itemquantity
        s=foundData.status
        l=a.length
        a[l-1].push(body.Item)
        b[l-1].push(body.ItemCost)
        c[l-1].push(body.ItemQuantity)
        var ner = {
            item:a,
            itemcost:b,
            itemquantity:c,
        }
        Bill.findOneAndUpdate({name:i},ner,function(err,res){
            //console.log(err+"and"+res)
        })
        }
    })
    res.redirect("/data/"+i)
})

// this code is used to update the status of any invoice
app.post("/update/:customerId",(req,res)=>{
    id=req.params.customerId
    body=req.body
    d=[]
    Bill.findOne({name:id},function(err,foundData){
        for(i=0;i<foundData.status.length;i++){
            if(i==body.number)
            {
                if(foundData.status[i]=="due")
                {
                    d.push("paid")
                }
                else{
                    d.push("due")
                }
            }
            else{
                d.push(foundData.status[i])
            }
        }
        var fresh={
            status:d
        }
        Bill.findOneAndUpdate({ame:id},fresh,function(err,response){
            if(!err){
                res.redirect("/status/"+id)
            }
            else{
                console.log(err)
            }
        })
    })
    
})

// This segment of code takes the data and creates a pdf of ivoice and mails it to the client

app.post("/invoice/:customerId",(req,res)=>{
    id=req.params.customerId
    //console.log(id)
    body=req.body
    body.status=body.status.toLowerCase()
    console.log(body)
    Bill.findOne({name:id},function(err,foundData){
        if(err){
            console.log("error"+err)
        }
        //console.log(foundData)
        a=foundData.status
        a.pop()
        a.push(body.status)
        c=foundData.notes
        c.push(body.notes)
        b=0
        for(j=0;j<foundData.item.length-1;j++){
            if(foundData.status[j]==="due"){
                for(i=0;i<foundData.item[j].length;i++){
                    b+=(foundData.itemcost[j][i]*foundData.itemquantity[j][i])
                }
            }
        }
        for(i=0;i<foundData.item[foundData.item.length-1].length;i++){
            if(a[foundData.item.length-1]==="due"){
                b+=foundData.itemcost[foundData.item.length-1][i]*foundData.itemquantity[foundData.item.length-1][i]
            }
        }
        var n={
            status:a,
            notes:c,
            dueAmount:b
        }
        Bill.findOneAndUpdate({name:id},n,function(err,res){
            console.log(err,res)
            Bill.findOne({name:id},function(err,foundData){
                if(err){
                    console.log("error"+err)
                }
                //console.log(foundData)
                const sender = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                      user: 'rahulvemula03@gmail.com',
                      pass: 'ratnakala'
                    },
                    tls:{
                        rejectUnauthorized: false,
                    }
                });
                var l=foundData.item.length
                var Items=foundData.item[l-1]
                var ItemCost=foundData.itemcost[l-1]
                var ItemQuantity=foundData.itemquantity[l-1]
        
                var total=0
        
                // creating a PDF of invoice

                const doc = new pdfmaker();
                doc.pipe(fs.createWriteStream('output.pdf'));
                doc
                    .fontSize(25)
                    .text('BOB the BUILDER', 100, 100)
                    .fontSize(14)
                    .text(foundData.name)
                    for(let i=0;i<Items.length;i++){
                        var subtotal=(ItemCost[i]*ItemQuantity[i])
                        doc.text(Items[i]+" is bought at Rs."+ItemCost[i]+" and quantity bought is "+ItemQuantity[i]+", Total cost is "+subtotal)
                        total=total+subtotal
                    }
                    doc.text("Payable amount is: "+total)
                    doc.text("STATUS: ")
                    doc.text(foundData.status[l-1])
                    doc.text("NOTE:")
                    doc.text(foundData.notes[l-1])
                doc.end()
                var mail = {
                    
                    from: '"BOB the BUILDER" <rahulvemula03@gmail.com>',
                    to: foundData.email,
                    cc: "rahulvemula03@gmail.com",//this line can be removed or edited
                    subject: "YOUR INVOICE",
                    attachments:
                    [
                        {
                            filename: 'output.pdf',
                            path: 'output.pdf'
                        }
                    ]
                };
                // sending email to the client
                sender.sendMail(mail, function(error, info) {
                    if (error) {
                    console.log(error);
                    } else {
                    console.log("Email sent successfully: "
                                + info.response);
                        fs.unlinkSync('output.pdf');
                    }
                });
            })
        })
    }) 
    res.redirect("/data/"+id)  
})

app.post("/status",(req,res)=>{
    res.redirect("/status/"+req.body.name)
})
// this segment of is credentials of the seller/company mail
// invoice is sent from the below mentioned mail ID 
const sender = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '**************@gmail.com',
      pass: '(password of the mentioned gmail account)'
    },
    tls:{
        rejectUnauthorized: false,
    }
});


app.listen(8000, function(){
    console.log("server started at 8000");
})