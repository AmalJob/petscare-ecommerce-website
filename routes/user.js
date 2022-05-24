var express = require('express');
const req = require('express/lib/request');
const res = require('express/lib/response');
const async = require('hbs/lib/async');
const { Db, ObjectId } = require('mongodb');
const { response } = require('../app');
var router = express.Router();
require('dotenv').config()
const productHelpers = require('../helpers/product-helpers');
const userHelpers=require('../helpers/user-helpers')
const serviceId=process.env.SERVICEID
const accountSid=process.env.ACCOUNTSID
const authToken=process.env.AUTHTOKEN
const client=require('twilio')(accountSid,authToken)
var paypal = require('paypal-rest-sdk');
const createReferal = require("referral-code-generator");


paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.CLIENTID,
  'client_secret': process.env.CLIENTSECRET
});

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}
const verifyBlock=(req,res,next)=>{
  if(req.user.blocked){
    req.session.user=null
    req.session.userLoggedIn=false;
    res.redirect('/')
  }else{
    next()
  }
}

/* GET home page. */
router.get('/',async function(req, res, next) {
  let user=req.session.user
  let todayDate = new Date().toISOString().slice(0, 10);
 
  let cartCount=null
  // let catOff = await productHelpers.startCategoryOffer(todayDate);
  if(req.session.user){
   cartCount=await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products)=>{
    productHelpers.getAllCategory().then((category)=>{
      console.log("products",products);

      res.render('user/view-products', {products,user,category,cartCount});
    })
   
   })
});

router.get('/login',(req,res)=>{

  if (req.session.user) 
    res.redirect('/')

  else {
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
  }
  
})

router.get('/signup',async(req,res)=>{
  let refer = (await req.query.refer) ? req.query.refer : null;
  res.render('user/signup',{refer})
})
router.post('/signup',(req,res)=>{
  let refer = createReferal.alphaNumeric("uppercase", 2, 3);
  req.body.refer = refer;

  if (req.body.referedBy != "") {
    userHelpers
      .checkReferal(req.body.referedBy)
      .then((data) => {
        req.body.referedBy = data[0]._id;
        req.body.wallet = 100;
        userHelpers.emailCheck(req.body.Email,req.body.phone).then((mail)=>{
          if(mail){
      
            if (mail.phone == req.body.phone) {
              let check = true;
              res.render('user/signup', { check: 'Mobile Already exist' })
            } else {
              let check = true;
              res.render('user/signup', { check: 'Email Already exist' })
            }
      
            let check=true;
            res.render('user/signup',{check})
          }
          else {
            userSignup = req.body;
      
            client.verify
            .services(serviceId)
            .verifications.create({
              to: `+91${req.body.phone}`,
              channel: "sms",
            }).then((response)=>{
              console.log("jjj",response);
               let signupPhone = req.body.phone;
                res.render("user/signupOtp", { signupPhone });
            })
          }
        })
      })
      .catch(() => {
        req.session.referErr = "Sorry No such Code Exists";
        res.redirect("/signup");
      });
  }else{
  
    userHelpers.emailCheck(req.body.Email,req.body.phone).then((mail)=>{
      if(mail){
  
        if (mail.phone == req.body.phone) {
          let check = true;
          res.render('user/signup', { check: 'Mobile Already exist' })
        } else {
          let check = true;
          res.render('user/signup', { check: 'Email Already exist' })
        }
  
        let check=true;
        res.render('user/signup',{check})
      }
      else {
        userSignup = req.body;
  
        client.verify
        .services(serviceId)
        .verifications.create({
          to: `+91${req.body.phone}`,
          channel: "sms",
        }).then((response)=>{
          console.log("jjj",response);
           let signupPhone = req.body.phone;
            res.render("user/signupOtp", { signupPhone });
        })
      }
    })
  }

})




var signupSuccess
router.get('/signupOtp',(req,res)=>{
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  let phoneNumber=req.query.phonenumber;
  let otpNumber=req.query.otpnumber;
  client.verify
      .services(serviceId)
      .verificationChecks.create({
        to: "+91"+phoneNumber,
        code:otpNumber,
      }).then((resp)=>{
        if(resp.valid){
          userHelpers.doSignup(userSignup).then((response)=>{
            console.log("ha",response);
            if(response.acknowledged){
                let valid=true;
                signupSuccess="You are successfully signed up"
                res.send(valid)
          }else{
              let valid=false;
              res.send(valid);
          }
          })
        }
      })
  
})


router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      if(!response.blocked){
      req.session.user=response.user
      req.session.userLoggedIn=true
       
      res.redirect('/')

      }else{
        req.session.userLoginErr="sorry your account is blocked"
      res.redirect('/login')
      }
    }else{

      req.session.userLoginErr="Invalid username or password"
      res.redirect('/login')
    }
  })
})
router.get('/product-details/:id', async (req,res)=>{
  let product= await productHelpers.getProductDetails(req.params.id)
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
   }
  
  
  if(req.session.user){
    let user=req.session.user
    res.render('user/product-details',{product,user,cartCount});
  }else{
    res.render('user/product-details',{product});
  }
})
router.get('/otpLogin',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/otpLogin',{'loginErr':req.session.userLoginErr})
    req.session.userLoginErr=false
  }
})


router.post('/otpLogin', (req, res) => {
  var phone = req.body.number;
 
  userHelpers.checkPhone(phone).then((num)=>{
    if(num){
    if(num.blocked){
      res.render('user/otpLogin',{otpErr1:true})
    }else{
      if(num){
        client.verify
        .services(serviceId)
        .verifications.create({
          to: `+91${req.body.number}`,
          channel: 'sms'
        })
        .then((resp)=>{
          if(resp){
            otpPhone = phone;
            res.render('user/otpSubmit',{otpPhone})
          }
        })
      }else{
        res.render('user/otpLogin',{otpErr:'Invalid Phone Number'})
      }
    }
  }else{
    res.render('user/otpLogin',{otpErr:'Invalid Phone Number'})
  }
    
  })
  otpPhone=null;
  })


router.post('/otpSubmit/:phone',(req,res)=>{
  let otp=req.body.otp
  let phonenumber=req.params.phone
 
  client.verify.services(serviceId).verificationChecks.create({
    to:`+91${phonenumber}`,
    code:otp
  }).then((resp)=>{
    if(resp.valid){
     
      userHelpers.doLoginOtp(phonenumber).then((response)=>{
        if(response.status){
          if(!response.blocked){
            req.session.user=response.user
            req.session.userLoggedIn=true
          res.redirect('/')
    
          }
          else{
            req.session.userLoginErr="sorry your account is blocked"
            res.redirect('/login')
            
          }
          
        }else{
           req.session.userLoginErr="invalid user name or password"
          res.redirect('/login')
        }
      })
    }else{
      req.session.userLoginErr="Incorrect Otp"
      res.render('user/otpLogin',{otpErr:'Incorrect OTP'})
    }
  })
     
   })
   
  


router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userLoggedIn=false;
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res,next)=>{
  let products= await userHelpers.getCartProducts(req.session?.user?._id)
 
  let totalValue=0
  if(products.length>0){

    totalValue=await userHelpers.getTotalAmount(req.session.user._id)
   res.render('user/cart',{products,user:req.session.user,totalValue})
  }else{
    res.render('user/cart-empty',{user:req.session.user})
  }
})

router.get('/add-to-cart/:id',(req,res)=>{
 
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})
router.post('/change-product-quantity',(req,res,next)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.user)
      res.json(response)
  })
})

router.post('/remove-cart-product',(req,res,next)=>{
  
  userHelpers.removeCartProduct(req.body).then((response)=>{
   
      res.json(response)
    })
})
router.get('/addNewAddress',verifyLogin,async(req,res)=>{
 
  // let address= await userHelpers.getUserAddressDetails(req.session.user?._id)

  let total=await userHelpers.getTotalAmount(req.session.user._id)
  let userDetails = await userHelpers.getUserDetails(req.session.user._id);
  let user=req.session.user
  res.render('user/orderAddress',{total,user,userDetails})
})
router.post('/addNewAddress',async(req,res)=>{
 
 

  let products=await userHelpers.getCartProductList(req.body.userId)
 
  
  if (req.session.couponTotal || req.session.walletTotal) {
    
    if (req.session.couponTotal) {
      var totalPrice = req.session.couponTotal;
    } else {
      var totalPrice = req.session.walletTotal;
    }
  }
  else{
    totalPrice= await userHelpers.getTotalAmount(req.body.userId)
  }
  console.log("tot",totalPrice);
userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{

  

  if(req.body['payment-method']==='COD'){
    userHelpers.clearCart(req.session.user._id).then(()=>{

    res.json({codSuccess:true})
    })
  }else if(req.body["payment-method"] == "Razorpay"){
    userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
       res.json(response)
    })
  }else {

    val = totalPrice /74
    totalPrice = val.toFixed(2)
    let totals = totalPrice.toString()
    req.session.total = totals;
  
      
    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://localhost:3000/success",
          "cancel_url": "http://localhost:3000/orderFail"
      },
      "transactions": [{
          "item_list": {
              "items": [{
                  "name": "Red Sox Hat",
                  "sku": "001",
                  "price": totals,
                  "currency": "USD",
                  "quantity": 1
              }]
          },
          "amount": {
              "currency": "USD",
              "total": totals
          },
          "description": "Hat for the best team ever"
      }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
        throw error;
    } else {
        console.log(payment);
        for(let i = 0;i < payment.links.length;i++){
          if(payment.links[i].rel === 'approval_url'){
            // res.redirect(payment.links[i].href);
            let link = payment.links[i].href;
            link = link.toString()
            res.json({ paypal: true, url: link })

          }
        }
    }
  });
  }
})


})

router.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  let totalPrice = req.session.total;
  

  let totals = totalPrice.toString();
  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          
          currency: "USD",
          "total": totals
        },
      },
    ],
  };

  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    function (error, payment) {
      if (error) {
        throw error;
      } else {
        req.session.couponTotal = null;
        userHelpers.clearCart(req.session.user._id).then(()=>{
            userHelpers.changePaymentStatus(req.session.orderId).then(() => {
          res.redirect("/order-success");
          })
        });
      }
    }
  );
});

router.get('/order-success',(req,res)=>{
  let user=req.session.user
  res.render('user/order-success',{user})
})

router.get('/orders',verifyLogin, async(req,res)=>{
  var orders= await userHelpers.getOrderUserDetails(req.session.user?._id)
  let user=req.session.user
  
  res.render('user/orders',{orders,user})
})

router.get('/view-order-products/:id',verifyLogin,async(req,res)=>{
 
  let products= await userHelpers.getOrderProductDetails(req.params.id)
  let user=req.session.user
  res.render('user/view-order-products',{products,user})
})
router.get('/userProfile',verifyLogin,async(req,res)=>{
  let user= await userHelpers.getUserDetails(req.session.user?._id)
 
  let refer=user.refer

  let referalLink = "http://localhost:3000/signup?refer=" + refer;
  console.log("link",referalLink);

  res.render('user/userProfile',{user,referalLink})
})

router.get('/editUserProfile',verifyLogin, async (req,res)=>{
  let user= await userHelpers.getUserDetails(req.session.user._id)
 
  res.render('user/editUserProfile',{user});
})

router.post('/editUserProfile',verifyLogin,(req,res)=>{
 
  let userId=req.body.userId
  req.session.user.Name=req.body.Name
  
  userHelpers.updateUserProfile(userId,req.body).then(()=>{
    res.redirect('/userProfile')
   
  })
})


router.post('/changePassword',verifyLogin,(req,res)=>{
  userHelpers.changePassword(req.body).then((response)=>{
  
   if(response.status){
     res.render('user/userProfile',{success:"password Changed Successfully",user:req.session.user})
   }else{
    
    let errorMsg=response.err;
    let user=req.session.user
     res.render('user/editUserProfile',{errorMsg,user})
   }

  })
})

router.get('/categoryView/:id',verifyLogin, async(req,res)=>{

  let Category=req.params.id
  let catView= await productHelpers.getAllCategory()
  let cartCount= await userHelpers.getCartCount(req.session.user._id)
  userHelpers.categoryView(Category).then((products)=>{
 
  productHelpers.getAllCategory().then((category)=>{
 

  res.render('user/categoryView',{products,user:req.session.user,cartCount,catView,category})
})
})
})


router.get('/cancelOrder/:id', verifyLogin,(req,res)=>{

  let orderId=req.params.id
 userHelpers.cancelOrder(orderId).then((response)=>{
    res.redirect('/orders')
  })
})

router.get('/address',verifyLogin, async(req,res)=>{
  let address= await userHelpers.getUserAddressDetails(req.session.user?._id)
 
  let user=req.session.user

  res.render('user/selectAddress',{address,user})
})

router.get('/editAddress/:id',verifyLogin, async (req,res)=>{
  let user1=req.session.user?._id
  let address= await userHelpers.getAddressDetails(req.params.id,user1)

  res.render('user/editAddress',{address});
})

router.post('/editAddress/:id',verifyLogin,(req,res)=>{
  let id=req.params.id
 
  userHelpers.updateAddress(req.params.id,req.body).then(()=>{
    res.redirect('/address')
   
  })
})

router.get('/deleteAddress/:id',verifyLogin,(req,res)=>{
  const userId=req.params.id
 
  userHelpers.deleteAddres(userId).then((response)=>{
    res.redirect('/address')
  })
})

router.get('/addAddress',async(req,res)=>{
  let user=req.session.user
  
  res.render('user/addAddress',{user})
})

router.post('/addAddress',verifyLogin,(req,res)=>{
  let userId = ObjectId(req.session.user._id)

  req.body.userId = userId

  
 userHelpers.addAddress(req.body,userId).then(()=>{
       res.redirect('/address')
 })
})



router.get('/orderAddressSelection',verifyLogin,async(req,res)=>{
 
  let address= await userHelpers.getUserAddressDetails(req.session.user?._id)
  let userDetails = await userHelpers.getUserDetails(req.session.user._id);
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  let user=req.session.user
  res.render('user/orderAddressSelect',{total,user,address,userDetails})
})

router.post('/orderAddressSelection',async(req,res)=>{

 
 if (req.session.couponTotal || req.session.walletTotal) {
    
    if (req.session.couponTotal) {
      var totalPrice = req.session.couponTotal;
    } else  {
      var totalPrice = req.session.walletTotal;
    }
  }
  else{
    totalPrice= await userHelpers.getTotalAmount(req.session.user._id)
  }


  let products=await userHelpers.getCartProductList(req.session.user._id)
  
  let user= await userHelpers.getUserDetails(req.session.user._id)
 
  let address= await userHelpers.getAddressDetails(req.query.addressId,req.session.user._id)
  
userHelpers.placeOrderr(address,products,totalPrice,req.query.payment,user,req.query.code,req.query.userr).then((orderId)=>{
  

  if(req.query.payment==='COD'){
    userHelpers.clearCart(user._id).then(()=>{

    res.json({codSuccess:true})
    })
  }else if (req.query.payment==='RAZORPAY'){
    userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
       res.json(response)
    })
  }

  else {

    val = totalPrice /74
      totalPrice = val.toFixed(2)
      let totals = totalPrice.toString()
      req.session.total = totals;
     
        
      const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/orderFail"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Red Sox Hat",
                    "sku": "001",
                    "price": totals,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": totals
            },
            "description": "Hat for the best team ever"
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          throw error;
      } else {
          console.log(payment);
          for(let i = 0;i < payment.links.length;i++){
            if(payment.links[i].rel === 'approval_url'){
              // res.redirect(payment.links[i].href);
              let link = payment.links[i].href;
              link = link.toString()
              res.json({ paypal: true, url: link })

            }
          }
      }
    });
  } 


})

 
})

router.post('/verify-payment',(req,res)=>{

  userHelpers.verifyPayment(req.body).then(()=>{

    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
 
      userHelpers.clearCart(req.session.user._id).then(()=>{
      res.json({status:true})
      })
     
    })

  }).catch((err)=>{
  
    res.json({status:false,errorrMsg:''})

  })
})

router.get('/orderFail',(req,res)=>{
  let user=req.session.user
  res.render('user/orederFail',{user})
})

router.get('/returnOrder/:id', verifyLogin,(req,res)=>{

  let orderId=req.params.id
 userHelpers.returnOrder(orderId).then((response)=>{
    res.redirect('/orders')
  })
})

router.post("/couponApply",verifyLogin, (req, res) => {
  let id = req.session.user._id;
  userHelpers.couponValidate(req.body, id).then((response) => {

    req.session.couponTotal = response.total;
    if (response.success) {
      res.json({ couponSuccess: true, total: response.total });
    } else if (response.couponUsed) {
      res.json({ couponUsed: true });
    } else if (response.couponExpired) {
      res.json({ couponExpired: true });
    } else {
      res.json({ invalidCoupon: true });
    }
  });
});

router.post("/applayWallet", async (req, res) => {
  var user = req.session.user._id;
 
  
  let ttl = parseInt(req.body.Total);
  let walletAmount = parseInt(req.body.wallet);
  let userDetails = await userHelpers.getUserDetails(user);
  
  if (userDetails.wallet >= walletAmount) {
    let total = ttl - walletAmount;
  
    userHelpers.applayWallet(walletAmount, user).then(() => {
      req.session.walletTotal = total;
      res.json({ walletSuccess: true, total });
    });
  } else {
    res.json({ valnotCurrect: true });
  }
});


router.get('/wallet',async(req,res)=>{
  let user= await userHelpers.getUserDetails(req.session.user?._id)
 
  let refer=user.refer

  let referalLink = "http://localhost:3000/signup?refer=" + refer;

  res.render('user/wallet',{user,referalLink})
})


module.exports = router;
