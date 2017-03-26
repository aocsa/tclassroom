//-------------------ALUMNO--------

// PARSE YA ESTA INICIALIZADO EN POLY-PROFILE

function saveCotization(expense){
    var UserClass = Parse.Object.extend("User");
    var user_sender = new UserClass();
    user_sender.id = sessionStorage.getItem('id');

    var user_receiver = new UserClass();
    user_receiver.id =  expense.homework_user_id;

    var HomeworkClass = Parse.Object.extend("Homework");
    var homework = new HomeworkClass();
    homework.id = expense._id;
    homework.set('status',  'cotizado' );

    verificarMessageExist(user_sender,user_receiver,expense.total,homework,'null');

    app.$.toast.text = 'New object created Message';
    app.$.toast.show();

}

function verificarMessageExist(userSender,userReceiver,cost,PointHomework,PointPayment){

        var TableMessage = Parse.Object.extend("Message");
        var query = new Parse.Query(TableMessage);

        var userClass = Parse.Object.extend("User");
        var userSend = new userClass( );
        userSend.id =  userSender.id;
        var userRec = new userClass( );
        userRec.id =  userReceiver.id;

        var homeworkClass = Parse.Object.extend("Homework");
        var homeworkObj = new homeworkClass( );
        homeworkObj.id =  PointHomework.id;

        query.equalTo("receiver",   userRec);
        query.equalTo("sender",   userSend);
        query.equalTo("homework",   homeworkObj);

        query.find({
            success: function(results) {
                if(results.length>=1){//lo normal es que sea ==1
                    var object = results[0];
                    saveTableMessage(userSender,userReceiver,cost,PointHomework,PointPayment,object.id);
                }else{
                    saveTableMessage(userSender,userReceiver,cost,PointHomework,PointPayment,"null");
                }
            },
            error: function(error) {
                console.log("Error: " + error.code + " " + error.message);
            }
        });

}

function saveTableMessage(userSender,userReceiver,cost,PointHomework,PointPayment,idMessage){
    var TableMessage = Parse.Object.extend("Message");
    var tableMessage = new TableMessage();
    if(idMessage!="null"){
        tableMessage.id = idMessage;
    }

    tableMessage.set("sender", userSender);
    tableMessage.set("receiver", userReceiver);
    tableMessage.set("cost", cost);

    tableMessage.set("homework", PointHomework);
    if(PointPayment!='null'){
        tableMessage.set("payment", PointPayment);
    }

    tableMessage.save(null, {
        success: function(tableMessage) {
            console.log('New tableMessage created with objectId: ' + tableMessage.id);
            //dialog.close();
            //page('/');

            pubnub.publish({
                channel: 'chatChannel',
                message: {foo: 'update-status', sender_id: userSender.id, receiver_id: userReceiver.id}
            },function(status, response){
                console.log(status.error, response);
            });

        },
        error: function(tableMessage, error) {
            console.log("Error: " + error.code + " " + error.message);
        }
    });
}

function verificarMensajePay(message,context,listMsg){
    if(message.meta){
        if(message.meta.title){
            if(message.meta.codeTransaction){//llegada del mensaje de pago
                sendMessageChangeInput('en progreso',context);
                return true;
            }
            else{
                if(message.meta.costo){//La tarea a sido cotizada
                    //sendMessageChangeInput('cotizado',context);
                    habilitarChat(listMsg,context,3);
                }else{//es una tarea nueva
                    sendMessageChangeInput('nuevo',context);
                }
                return false;
            }
        }return false;
    }return false;
}

function verificarTareaNoCotizada(listMsg,context,estado){
    var tam = listMsg.length;//solo verificamos el ultimo mensaje
    if(tam>0){
        var msg = listMsg[tam-1];
        if(verificarMensajePay(listMsg[tam-1],context,listMsg)){
            return;
        }
        //if(listMsg[tam-1].meta){
            if(estado!='en progreso'/* && listMsg[tam-1].meta.costo*/){
                habilitarChat(listMsg,context,3);
            }
        //}
        
    }
}

//habilitamos el chat para que pueda conversar un numero determinado de veces antes de que la tarea pase a en progreso
function habilitarChat(listMsg,context,num){
    var tam = listMsg.length;//solo verificamos el ultimo mensaje
    if(tam>0){
        var contador = 0;
        if(tam==1){
            sendMessageChangeInput('nuevo',context);
            return;
        }
    
       for(var i=0;i<tam;i++){//+1 por que el mensaje de cotizado no cuenta
           
           if(listMsg[i].who=="Profesor"){
               contador++;
           }
       }
       if(contador==num+1){//pasa a estado cotizado con un nuevo label en el inputmesage,pidiendo nueva cotizacion
            sendMessageChangeInput('nuevo',context);
            context.$.inputCotizar.label = "Enviar nueva cotizacion ...";
            return;
        }
        if(contador>num){// solo sucede cuando ya envio nuva cotizacion
            sendMessageChangeInput('cotizado',context);
            return;
        }
       sendMessageChangeInput('en progreso',context);
       context.$.inputnormal.label = "Solo tienes 3 mensajes para enviar ...";
    }
}

function onerrorImg(source){
    //alert("error image load");
    source.hidden = true;
}

function sendMessageChangeInput(estado,contexto){
    if(estado=='nuevo'){//El profesor tiene que cotizar
        contexto.$.message_normal.hidden = true;
        contexto.$.message_cotizacion.hidden = false;  
        contexto.$.inputCotizar.enable=true;   
        contexto.$.inputCotizar.disabled = false;
        contexto.$.inputCotizar.label = "Cotizar tarea .."; 
                 
    }
    if(estado=='cotizado'){//Bloqueamos sendmessage para que el alumno responda con el pago
        contexto.$.message_normal.hidden = true;
        contexto.$.message_cotizacion.hidden = false; 
        
        contexto.$.inputCotizar.disabled = true;
        contexto.$.inputCotizar.enable=false; 
        contexto.$.inputCotizar.label = "Esperar a que el alumno realize el pago";
    }

    if(estado=='en progreso'){//puede hablar normalmente
        contexto.$.message_normal.hidden = false;
        contexto.$.message_cotizacion.hidden = true; 
        contexto.$.inputnormal.label = "Typee message .."; 
    }
}

function verificarSchool(){
    if(sessionStorage.getItem('school')=='null'){
        selectSchoolDialog.open();
    }
}

function actualizarSchool(){
    console.log("actualizarSchool");
    var combobox =  document.querySelector('#selectSchool');
    var selectCombobox = combobox.selectedItem;
    if(selectCombobox){
        var User_ = Parse.Object.extend("User");
        var myuser = new User_();
        myuser.id = sessionStorage.getItem('id');
        myuser.set('school',selectCombobox);
        myuser.save(null, {
            success: function(tableExpense) {
                sessionStorage.setItem('school', selectCombobox);
                selectSchoolDialog.close();
            },
            error: function(error) {
                console.log("Error: " + error.code + " " + error.message);
            }
        });
    }
}

function StringSet() {
    var setObj = {}, val = {};

    this.add = function(str) {
        setObj[str] = val;
    };

    this.contains = function(str) {
        return setObj[str] === val;
    };

    this.remove = function(str) {
        delete setObj[str];
    };

    this.values = function() {
        var values = [];
        for (var i in setObj) {
            if (setObj[i] === val) {
                values.push(i);
            }
        }
        return values;
    };
}
function isFileImage(type){
    var typeImg = "image/";
    var tam = typeImg.length;
    for(var i=0;i<tam;i++){
        if(type[i]!=typeImg[i]){
            return false;
        }
    }
    return true;
}
function prepareSaveFile(receipt){
    var name = receipt.name;
    var file = receipt.data;
    if(isFileImage(receipt.type)){
        file = new File([receipt.data],name);
    }
    var parseFile = new Parse.File(name, file);
    parseFile.save().then(function() {
        // The file has been saved to Parse.
    }, function(error) {
        // The file either could not be read, or could not be saved to Parse.
        console.log('error parseFile');
    });
    return parseFile;
}
function saveFileChat(file,idHomework,channel,context){
    var fileObj = new Object();
    fileObj.name =file.name;
    fileObj.type=file.type;
    fileObj.data =file;

    context.$.inputnormal.disabled = true;
    context.$.inputnormal.enable=false; 
    context.$.inputnormal.label = "Esperando en subir archivo...";

    var parseFile = prepareSaveFile(fileObj);

    var HomeworkClass = Parse.Object.extend("Homework");
    var homework = new HomeworkClass();
    homework.id = idHomework;
    
    var FileChatClass = Parse.Object.extend("FileChatHomework");
    var filechatObj = new FileChatClass();
    filechatObj.set("attachment", parseFile);
    filechatObj.set("idHomework",homework);

    filechatObj.save(null, {
        success: function(filechatObj) {
            sendMsgFileChat(filechatObj.get('attachment')._url,channel,context);
        },
        error: function(filechatObj, error) {
            console.log("Error: " + error.code + " " + error.message);
        }
    });

}
function manejarDivCotizacionChat(context){
    if(context.meta.attachment){
        context.$.imagenId.hidden = false;
        context.$.fileLink.hidden = false;
    }
    if(context.meta.costo){//solo existe si se cotiza
        context.$.costo.hidden=false;
    }
    if(context.meta.homework_user){//no hay homework_user cuando se cotiza
        context.$.homework_user.hidden=false;
    }
    
    if(context.meta.codeTransaction){//solo cuando el alumno paga
        context.$.codeTransfer.hidden=false;
    }
    //Para mostrar solo la imagen o link del archivo si es que se envia archivos adjuntos en el chat
    if(!context.meta.title){
        context.$.contentImportanteCotizacion.hidden=true;
    }
    if(context.meta.title){
        context.$.contentImportanteCotizacion.hidden=false;
    }
}
function sendMsgFileChat(myurl,mychannel,context){
    var pubnub = new PubNub({ publishKey : 'pub-c-467437f5-5346-4f8c-9ddf-2de1c90a93c8', subscribeKey : 'sub-c-52679430-efef-11e6-b753-0619f8945a4f' });
   var mycolor = 'moss';
   var mycat = 'profesor';
   var   myuuid = mycolor + '-' + mycat;
   var    myavatar = 'images/' + mycat + '.jpg';
    var myAttachment = new Object();
    myAttachment.url = myurl;

    var metaObj = {
        attachment: myAttachment
    };

    pubnub.publish(  {
        message: {
            uuid: myuuid,
            username : sessionStorage.getItem('username'),
            avatar: myavatar,
            color: mycolor,
            text: '',
            timestamp: new Date().toISOString(),
            meta:   metaObj
        },
        channel:  mychannel
    });

    context.$.inputnormal.disabled = false;
    context.$.inputnormal.enable=true; 
    context.$.inputnormal.label = "Type message...";
}
function verificarFechaTareas(expense){
    var dateCurrent = new Date();
    //console.log(dateCurrent.getDate() + "/" + (dateCurrent.getMonth() +1) + "/" + dateCurrent.getFullYear());
    var parts =expense.get('homework').get('deadline').split('-');
    var mydate = new Date(parts[0],parts[1]-1,parts[2]);
    //console.log(mydate.getDate() + "/" + (mydate.getMonth() +1) + "/" + mydate.getFullYear());

    if(mydate<dateCurrent){
        console.log("finalizo! " + expense.get('title'));
        var HomeworkClass = Parse.Object.extend("Homework");
        var homework = new HomeworkClass();
        homework.id = expense.get('homework').id;
        homework.set('status','finalizado');
        homework.save();
    }
}