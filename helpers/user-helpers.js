var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
var Promise=require('promise')
var objectId=require('mongodb').ObjectId

const Razorpay = require('razorpay')
const moment=require('moment')

var instance = new Razorpay({
    key_id: 'rzp_test_AdWx5aJ0abf1sc',
    key_secret: '9dkrFazf7QSEfRbSGYQD6c4A',
  });
// const { promise, reject } = require('bcrypt/promises')
const async = require('hbs/lib/async')
const { response } = require('../app')
const { resolve, reject } = require('promise')

module.exports={
    doSignup:(userData)=>{
        console.log("data",userData);
        return new Promise(async(resolve,reject)=>{

            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data)
            })
            if(userData.referedBy != ""){
                console.log("refer",userData.referedBy);
                db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userData.referedBy)},{ $inc:{wallet:100}})


            }
        })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
           
            if(user){
           
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("true");
                        response.blocked=user.blocked
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("false");
                        resolve({status:false})
                    }
                })
            }else{
                console.log("failed");
                resolve({status:false})
            }
        })
       },emailCheck:(mail,mobi)=>{
           return new Promise(async(res,rej)=>{
               let found= await db.get().collection(collection.USER_COLLECTION).findOne({ $or:[ {Email:mail}, {phone:mobi} ]})
               res(found)
           })
       },checkPhone:(phone)=>{
        console.log(phone);
        return new Promise(async(resolve,reject)=>{
           await db.get().collection(collection.USER_COLLECTION).findOne({phone:phone}).then((resp)=>{
               console.log(resp);
                resolve(resp)
        
            })
        })
    },
    doLoginOtp:(phone)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false;
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({phone:phone})
            
            console.log("user :",user);
            if(user)
            {

                response.blocked=user.userBlocked
                response.user=user
                response.status=true
                resolve(response)

            }else{
                resolve({status:false})
            }
           
        })

    },
    categoryView:(categoryView)=>{
        return new Promise(async(resolve,reject)=>{
            let product=await db.get().collection(collection.PRODUCT_COLLECTION).find({Category:categoryView}).toArray()
            resolve(product)
        })
     },



    addToCart:(proId,userId)=>{
        let proObj={
            item:objectId(proId),
            quantity:1

        }
return new Promise(async(resolve,reject)=>{
    let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
    if(userCart){
        let proExist=userCart.products.findIndex(product=> product.item==proId)
        console.log(proExist);
        if(proExist!=-1){
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({user:Object(userId),'products.item':objectId(proId)},
            
            {
                $inc:{'products.$.quantity':1}
            }).then(()=>{
                resolve()
            })
        }else{
      db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},
       {
          
               $push:{products:proObj}
           }
       
      ).then((response)=>{
          resolve()
      })
    }
    }else{
        let cartObj={
            user:objectId(userId),
            products:[proObj]
        }
        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
            resolve()
        })
    }
})
    }, getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems= await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
               
            ]).toArray()
           
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        let count=0
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
               count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
      details.count=parseInt(details.count)
       details.quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:objectId(details.cart)},
                {
                  $pull:{products:{item:objectId(details.product)}}
                }
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            
            {
                $inc:{'products.$.quantity':details.count}
            }).then((response)=>{
                resolve({status:true})
            })
        }
        })

    },
    
    removeCartProduct: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }

                    }
                ).then((response) => {
                    resolve(response)
                })
        })
    },
    getTotalAmount:(userId)=>{

        return new Promise(async(resolve,reject)=>{
            let total= await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
                    }
                }
               
            ]).toArray()
           console.log("to",total[0]?.total);
            resolve(total[0]?.total)
        })
      
    },
    placeOrder:(order,products,total)=>{
        let coupon = order.Coupon
        return new Promise((resolve,reject)=>{
          console.log(order,products,total);
          let dateIso= new Date()
          let date= moment(dateIso).format('YYYY/MM/DD')
          let time= moment(dateIso).format('HH:mm:ss')
          let status=order['payment-method']==='COD'?'Placed':'Cancelled'
          if(status=='Cancelled'){
            var Cancelled=true
         }else if(status=='Placed'){
             Cancelled=false
         }
          let orderObj={
              deliveryDetails:{
                  name:order.name,
                  address:order.address,
                  pincode:order.pincode,
                  mobile:order.phone,
                  userId:objectId(order.userId)

              },
              userId:objectId(order.userId),
              paymentMethod:order['payment-method'],
              products:products,
              totalAmount:total,
              Coupon: coupon,
              status:status,
              date: date,
              time: time,
              dateIso: dateIso,
              Cancelled:Cancelled
             
          }
          let user = order.userId 
          console.log("uss",user);
          db.get().collection(collection.COUPON_COLLECTION).updateOne({ Coupon: coupon },
              {
                  $push: {
                      Users: user
                  }
          }).then(()=>{

         
          db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
             
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(orderObj.deliveryDetails).then((respons)=>{
            
              resolve(response.insertedId)
          })
        })
    })
        })
    },
    placeOrderr:(order,products,total,method,user,code,user1)=>{
       
      
      
      
        return new Promise((resolve,reject)=>{
          console.log(order,products,total);
          let dateIso= new Date()
          let date= moment(dateIso).format('YYYY/MM/DD')
          let time= moment(dateIso).format('HH:mm:ss')
          let status=order['payment-method']==='COD'?'Placed':'Cancelled'
          console.log("st",status);
          var Cancelled=false;       
          if(status=='Cancelled'){
             var Cancelled=true
          }else{
              Cancelled=false
          }
          let orderObj={
              deliveryDetails:{
                  name:order.name,
                  address:order.address,
                  pincode:order.pincode,
                  mobile:order.mobile
                 

              },
              userId:objectId(order.userId),
              paymentMethod:method,
              products:products,
              totalAmount:total,
              Coupon: code,
              status:status,
              date: date,
              time: time,
              dateIso: dateIso,
              Cancelled:Cancelled
             
          }
           
          let user = user1
         
          db.get().collection(collection.COUPON_COLLECTION).updateOne({ Coupon: code },
              {
                  $push: {
                      Users: user
                  }
          }).then(()=>{

         
          db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
             
            
          
              resolve(response.insertedId)
          
        })
    })
    })
        
    },
    clearCart:(id)=>{
        console.log("idd",id);
        return new Promise((resolve,reject)=>{

            db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(id)}).then((response)=>{
    
                resolve(response)
            })
        })
        

    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },getOrderUserDetails:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let orders= await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).sort({date:-1}).toArray()
          
            resolve(orders)
        })


    },
    getOrderProductDetails:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
               
            ]).toArray()
           
          
            resolve(orderItems)
        })
    },getUserDetails:(userId)=>{
        return new Promise(async(resolve,reject)=>{
       let user= await db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)})
        
             resolve(user)
        

         

        })
    },
    updateUserProfile:(userId,userDetails)=>{
      
        
       
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{
                $set:{
                    Name:userDetails.Name,
                    Email:userDetails.Email,
                    phone:userDetails.phone,
                   
                   
                
                }
            }).then((response)=>{
                resolve()
            })
        })
    }
    
    



       ,changePassword: (details) => {
       
        return new Promise(async (resolve, reject) => {
            let user =await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(details.userId) })
           
            if (user) {
                bcrypt.compare(details.Password, user.Password).then(async(status) => {
                    if (status) {
                        details.newPassword = await bcrypt.hash(details.newPassword, 10)
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(details.userId) }, {
                            $set: {
                                Password: details.newPassword
                            }
                        }).then((response) => {
                            if (response) {
                                resolve({ status: true ,succPass:"Password changed"})
                            } else {
                                console.log("error");
                                resolve({ status: false, err: "Password not updated" })
                            }
                        })

                    } else {
                        resolve({ status: false, err: "Please enter the current Password properly" })
                    }

                })
            }
        })
    },cancelOrder:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                $set:{
                  status:"Cancelled",
                  Cancelled:true,
                  Delivered:false
                    
                
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },getUserAddressDetails:(userId)=>{
       
        return new Promise(async(resolve,reject)=>{
           let address= await db.get().collection(collection.ADDRESS_COLLECTION).find({userId:objectId(userId)}).toArray()
         
            resolve(address)
        })


    }
    
    ,getAddressDetails:(addressId)=>{
       
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).findOne({_id:objectId(addressId)}).then((address)=>{
             
                resolve(address)
            })
        })
    },updateAddress:(addressId,addressDetails)=>{
        
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).updateOne({_id:objectId(addressId)},{
                $set:{
                    name:addressDetails.name,
                    address:addressDetails.address,
                    pincode:addressDetails.pincode,
                    mobile:addressDetails.mobile
                
                }
            }).then((response)=>{
               
                resolve()
            })
        })
    },deleteAddres:(addressId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).remove({_id:objectId(addressId)}).then((response)=>{
                console.log(response);
                resolve(response)
            })
        })
    },addAddress:(address)=>{
       
      
        return new Promise((resolve,reject)=>{

       
        db.get().collection(collection.ADDRESS_COLLECTION).insertOne(address).then((data)=>{
            console.log(data);
           resolve(data.insertedId)
        })
    })
    },
    generateRazorpay:(orderId,total)=>{
      
      return new Promise((resolve,reject)=>{
       
        var options={
            amount: total*100,
            currency:"INR",
            receipt:""+orderId
        };
        instance.orders.create(options, function(err,order){
            if(err){
               
            }else{

               
                resolve(order)
            }
        })

      })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
          

           const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256','9dkrFazf7QSEfRbSGYQD6c4A')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac= hmac.digest('hex')
            console.log("hmac",hmac);
            if(hmac==details['payment[razorpay_signature]']){
                console.log("hellooo");
                resolve()
            }else{
                reject()
            }
        })

    }
    ,changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                $set:{
                  status:"Placed"
                  
                    
                
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    returnOrder:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                $set:{
                  status:"Returned"
                    
                
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    couponValidate: (data, user) => {
       
        var da= data
       
        return new Promise(async(res,rej)=>{
            obj = {}
                let date=new Date()
                date=moment(date).format('YYYY-MM-DD')
                let coupon= await db.get().collection(collection.COUPON_COLLECTION).findOne({Coupon:data.Coupon})
                console.log("c",coupon);
                if(coupon){
                   
                        let users = coupon.Users
                       
                        let userChecker = users.includes(user)
                     
                        if(userChecker){
                            obj.couponUsed=true;
                           
                            res(obj)
                        }else{
                            if(date <= coupon.Expiry){
                              
                                let total = parseInt(data.Total)
                                let percentage = parseInt(coupon.Offer)
                                let discountVal = ((total * percentage) / 100).toFixed()
                                obj.total = total - discountVal
                                obj.success = true
                              
                                res(obj)
                            }else{
                                obj.couponExpired = true
                                 
                                   res(obj)
                            }
                        }
                    }else{
                        obj.invalidCoupon = true

                        
                        
                        res(obj)

                    }   
             })
        },

          // Chech the referal Code
          checkReferal: (referal) => {
            return new Promise(async (res, rej) => {
              let refer = await db.get().collection(collection.USER_COLLECTION).find({ refer: referal }).toArray();
              if(refer){
                  res(refer)
              }else{
                  res(err)
              }
            });
          },

        // __________The wallet section started___________

          applayWallet:(val,userId)=>{
              let value=parseInt(val)
            return new Promise((res,rej)=>{
                db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{ $inc: { wallet: -value }}).then((response)=>{
                    res(response)
            })
            }) 
    
        },

        addWallet:(userId,total)=>{
            let Total=parseInt(total)
            return new Promise((res,rej)=>{
                db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{ $inc: { wallet: Total } }).then((response)=>{
                    res(response)
                })
            })

        }
   
    }