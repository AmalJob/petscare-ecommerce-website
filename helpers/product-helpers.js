var db=require('../config/connection')
var collection=require('../config/collections')
const async = require('hbs/lib/async');
const { resolve, reject } = require('promise');
const moment= require('moment')

var objectId=require('mongodb').ObjectId

module.exports={

    addProduct:(product,callback)=>{
       
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then(async(data)=>{
            let products= await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
         
    
        
           for(i=0;i<products.length;i++){
            let OP =  parseInt( products[i].Orginalprice)
            let OfP =  parseInt( products[i].Offerpercentage)
            console.log("of",OfP);
            var Price
              if(OfP){
             Price= OP-(OP*(OfP/100)).toFixed(0)
             
              }else{
                  Price=OP
              }
              var ids = products[i]._id

           }
            //  console.log(offerprice);
              
             
         
             
            db.get().collection(collection.PRODUCT_COLLECTION).findOneAndUpdate({_id:objectId(ids)},{$set:{"Price":Price}})
           
           callback(data.insertedId)
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
           let products= await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).remove({_id:objectId(proId)}).then((response)=>{
               
                resolve(response)
            })
        })
    },getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
               
                resolve(product)
            })
        })
    },
    updateProduct:(proId,proDetails)=>{
      
        let OP =  parseInt( proDetails.Orginalprice)
        let OfP =  parseInt( proDetails.Offerpercentage)

        var Price
        if(OfP){
       Price= OP-(OP*(OfP/100)).toFixed(0)
       
        }else{
            Price=OP
        }
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},{
                $set:{
                    Brand:proDetails.Brand,
                    Category:proDetails.Category,
                    Details:proDetails.Details,
                    Price:Price,
                    Qty:proDetails.Qty,
                  
                    Orginalprice:proDetails.Orginalprice,
                    Offerpercentage:proDetails.Offerpercentage
                
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    getAllUsers:()=>{
        return new Promise(async (res,rej)=>{
            let users= await db.get().collection(collection.USER_COLLECTION).find().toArray()
           
            res(users)
        })
    },
    getUserDetails:(userId)=>{
     return new Promise(async(res,rej)=>{
         db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)}).then((user)=>{
             res(user)
         })
     })
    },blockUser:(userId)=>{
       return new Promise((resolve,reject)=>{
           db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{$set:{
               blocked:true
           }}).then((response)=>{
               resolve(response)
           })
       })
    },unblockUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{$set:{
                blocked:false
            }}).then((response)=>{
                resolve(response)
            })
        })
    },addCategory:(category,callback)=>{
      
        db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((data)=>{
            console.log(data);
           callback(data.insertedId)
        })
    },
    getAllCategory:()=>{
        return new Promise(async(resolve,reject)=>{
           let category= await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category)
        })
    },deleteCategory:(catId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).remove({_id:objectId(catId)}).then((response)=>{
                console.log(response);
                resolve(response)
            })
        })
    },
    updateCategory:(catId,catDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({_id:objectId(catId)},{
                $set:{
                   Category:catDetails.Category
                    
                
                }
            }).then((response)=>{
                resolve()
            })
        })
    },getcategoryDetails:(catId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(catId)}).then((category)=>{
               
                resolve(category)
            })
        })
    },
    getAllOrders:()=>{
        return new Promise(async (res,rej)=>{
            let orders= await db.get().collection(collection.ORDER_COLLECTION).find().sort({date:-1}).toArray()
           
            res(orders)
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
    }, statusUpdate:(status,orderId)=>{
        return new Promise((resolve,reject)=>{
            if(status=="Cancelled"){

                db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                    $set:{
                      status:status,
                      Cancelled:true,
                      Delivered:false
    
                      
                     
                    
                    }
                })

            }
            else if(status=="Delivered"){
                db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                    $set:{
                      status:status,
                      Delivered:true,
                      Cancelled:false
    
                      
                     
                    
                    }
                })

            }else{

            
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                $set:{
                  status:status,

                  
                 
                
                }
            }).then((response)=>{

                resolve(true)
            })
        }
        })
    }
  
   ,
   dailyReport:()=>{
      return new Promise( async (resolve,reject)=>{
          let report= await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
          let amount=report[0].totalAmount
         
          var totalReport=0
          var OP
          for(i=0;i<report.length;i++){
             OP =   report[i].totalAmount
           
           
           
            totalReport= parseInt(totalReport)+OP
           
        }
       
     


          resolve(report,totalReport)
      })
   },
   getTotalIncome: ()=>{
 
    return new Promise(async(res,rej)=>{
        let total= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
           {
               $match: {
                   status: "Delivered"
               },
           },
           {
               $group: {
                   _id: null,
                   total: { $sum: "$totalAmount"}
               },
           }
       ]).toArray()
  
       
           res(total[0].total)
       
    })
},
getTotalUsers:()=>{
    return new Promise(async(res,rej)=>{
        let totalUsers = await db.get().collection(collection.USER_COLLECTION).count()
        res(totalUsers)
    })
},
getTotalOrders: () => {
    return new Promise(async (res, rej) => {
        let orders = await db.get().collection(collection.ORDER_COLLECTION).count()
        res(orders)
    })
},
getTotalProducts: () => {
    return new Promise(async (res, rej) => {
        let products = await db.get().collection(collection.PRODUCT_COLLECTION).count()
        res(products)
    })
},
getdailyIncome:()=>{
    return new Promise(async(resolve,reject)=>{
        let dailySale= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                    status:"Delivered"
                }
            },
            
            {
                $group:{
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateIso" } } ,
                    totalAmount: { $sum: "$totalAmount"},
                    count:{$sum:1}
                }
            },
            {
                $sort:{_id: -1}
            },
            {
                $limit:7
            }
        ]).toArray()
       
        resolve(dailySale)
    })
},
getCurrentDaySale:()=>{
    return new Promise(async(resolve,reject)=>{
        let currentDate= new Date
        let curdate = moment(currentDate).format('YYYY/MM/DD')
        currentDate=currentDate.toISOString().split('T')[0]
        let todaySale= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                    status:"Delivered"
                }
            },
            {
              $project:{
                   date:1,totalAmount:1
              }
            },
            {
                 $match:{date: curdate}
            },
            {
                $group:{
                    _id:"$date",
                    total: { $sum: "$totalAmount"},
                   
                }
            }
            
           
        ]).toArray()
        let data=0
       todaySale.map(val => data= val.total)
     
        resolve(data)
    })
},
getYearlySale:()=>{

    let curDate= new Date
    let  currentYear= curDate.getFullYear();
         currentYear= currentYear+""

    return new Promise(async(resolve,reject)=>{
      
        let yearlySale= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                    status:"Delivered"
                }
            },
            {
              $project:{
                dateIso: { $dateToString: { format: "%Y", date: "$dateIso" } },totalAmount:1
              }
            },
            
            {
                $group:{
                    _id:"$dateIso",
                    total: { $sum: "$totalAmount"},
                   
                }
            }
            
           
        ]).toArray()
      
        
        resolve(yearlySale)
    })
},
countsalemonth:()=>{
    return new Promise(async(resolve,reject)=>{
        let dailySale=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                    "status":"Delivered"
                }
            },
          
            {
                $group:{
                    _id: { $dateToString: { format: "%Y-%m", date: '$dateIso' } },
                    totalAmount:{$sum:"$totalAmount"},
                count:{$sum:1}
                }
            },
            {
            $sort:{_id:-1}
            },
          
        ]).toArray()
      
        resolve(dailySale)
    })

},
addCoupon:(data)=>{
    return new Promise(async(res,rej)=>{
       let startDateIso=new Date(data.Starting)
       let endDateIso=new Date(data.Expiry)
       let expiry = await moment(data.Expiry).format('YYYY-MM-DD')
        let starting = await moment(data.Starting).format('YYYY-MM-DD')
        let dataobj = await {
           Coupon: data.Coupon,
           Offer: parseInt(data.Offer),
           Starting: starting,
           Expiry: expiry,
           startDateIso: startDateIso,
           endDateIso: endDateIso,
           Users: []
       }
       db.get().collection(collection.COUPON_COLLECTION).insertOne(dataobj).then(()=>{
           res()
       }).catch((err)=>{
           res(err)
       })

    })
},
 startCouponOffers:(date)=>{
    let couponStartDate = new Date(date);
   return new Promise(async(res,rej)=>{
       let data= await db.get().collection(collection.COUPON_COLLECTION).find({startDateIso:{$lte:couponStartDate}}).toArray()
       console.log("this is the result ",data);
       if(data.length >0){
           await data.map((onedata)=>{
               db.get().collection(collection.COUPON_COLLECTION).updateOne({_id:objectId(onedata._id)},{
                 $set:{
                   Available: true
                 }
               }).then(()=>{
                   res()
               })
           })
       }else{
           res()
       }
   })


},


//get the all coupen Details
getAllCoupons:()=>{
    return new Promise((res,rej)=>{
        let coupon=db.get().collection(collection.COUPON_COLLECTION).find().toArray()
        res(coupon)
    })
    
},
deleteCoupon: (id) => {
    return new Promise((res,rej)=>{
        db.get().collection(collection.COUPON_COLLECTION).deleteOne({_id:objectId(id)}).then(()=>{
            res()
        })
    })

},
//Category offers
addCategoryOffer: (data) => {
    return new Promise((res,rej)=>{
        data.startDateIso=new Date(data.Starting)
       data.endDateIso=new Date(data.Expiry)
       db.get().collection(collection.CATEGORY_OFFERS).insertOne(data).then(async (response) => {
           res(response)
       }).catch((err) => {
           rej(err)
       })

   })
   },

   getAllCatOffers: () => {
       return new Promise((res,rej)=>{
           let categoryOffer=db.get().collection(collection.CATEGORY_OFFERS).find().toArray()
           res(categoryOffer)
       })
   },  
  
   deleteCatOffer:(id)=>{
      
    return new Promise(async(res,rej)=>{
        let categoryOffer= await db.get().collection(collection.CATEGORY_OFFERS).findOne({_id:objectId(id)})
       
        let catName=categoryOffer.category
        let product=await db.get().collection(collection.PRODUCT_COLLECTION).find({Category:catName, offer: { $exists: true }}).toArray()
       
        if(product){
            db.get().collection(collection.CATEGORY_OFFERS).deleteOne({_id:objectId(id)}).then(async()=>{
                await product.map((product)=>{

                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(product._id)},{
                        $set:{
                            Price: product.actualPrice
                        },
                        $unset:{
                            offer:"",
                            catOfferPercentage:'',
                            actualPrice:''
                        }
                    }).then(()=>{
                        res()
                    })
                })
            })
        }else{
            res()
        }

    })

},
monthlyReport: () => {
    return new Promise(async (res, rej) => {
      let today = new Date();
    
      let end = moment(today).format('YYYY/MM/DD')
     
      let start = moment(end).subtract(30, 'days').format('YYYY/MM/DD')
      
    
      let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $ne: "Cancelled" } }).toArray()
     
      let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
      let orderSuccessLength = orderSuccess.length
      let orderTotalLength = orderTotal.length
      let orderFailLength = orderTotalLength - orderSuccessLength
    
      let total = 0;
      let paypal = 0;
      let razorpay = 0;
      let cod = 0;
      for (let i = 0; i < orderSuccessLength; i++) {
        total = total + orderSuccess[i].totalAmount;
        if(orderSuccess[i].paymentMethod=='PAYPAL'){
          paypal++;
      }else if(orderSuccess[i].paymentMethod=='RAZORPAY'){
          razorpay++;
      }else if(orderSuccess[i].paymentMethod=='COD'){
          cod++;
      }
      }
      var data = {
        start: start,
        end: end,
        totalOrders: orderTotalLength,
        successOrders: orderSuccessLength,
        failedOrders: orderFailLength,
        totalSales: total,
        cod: cod,
        paypal: paypal,
        razorpay:  razorpay,
        currentOrders: orderSuccess
      }
     
      res(data)
    })
  },salesReport:(date)=>{
    return new Promise(async(res,rej)=>{
        
        let end= moment(date.EndDate).format('YYYY/MM/DD')
        let start=moment(date.StartDate).format('YYYY/MM/DD')
  
        let orderSuccess= await db.get().collection(collection.ORDER_COLLECTION).find({date:{$gte:start,$lte:end},status:{ $ne: 'Cancelled' }}).toArray()
        let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({date:{$gte:start,$lte:end}}).toArray()
        let orderSuccessLength = orderSuccess.length
        let orderTotalLength = orderTotal.length
        let orderFailLength = orderTotalLength - orderSuccessLength
        let total=0;
        let paypal=0;
        let razorpay=0;
        let cod=0;
        for(let i=0;i<orderSuccessLength;i++){
            total=total+orderSuccess[i].totalAmount;
            if(orderSuccess[i].paymentMethod=='PAYPAL'){
                paypal++;
            }else if(orderSuccess[i].paymentMethod=='RAZORPAY'){
                razorpay++;
            }else{
                cod++;
  
            }
        }
        var data = {
           start: start,
           end: end,
           totalOrders: orderTotalLength,
           successOrders: orderSuccessLength,
           failedOrders: orderFailLength,
           totalSales: total,
           cod: cod,
           paypal: paypal,
           razorpay: razorpay,
           currentOrders: orderSuccess
       }
   res(data)
   })
  
  }
   
}