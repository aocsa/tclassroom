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

    saveTableMessage(user_sender,user_receiver,expense.total,homework,'null');

    app.$.toast.text = 'New object created Message';
    app.$.toast.show();

}

function saveTableMessage(userSender,userReceiver,cost,PointHomework,PointPayment){
    var TableMessage = Parse.Object.extend("Message");
    var tableMessage = new TableMessage();
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

function verificarMensajePay(message,context){
    if(message.meta){
        if(message.meta.title){
            if(message.meta.codeTransaction){//llegada del mensaje de pago
                context.$.message_normal.hidden = false;
                context.$.message_cotizacion.hidden = true; 
            }
            else{
                if(message.meta.costo){//La tarea a sido cotizada
                    sendMessageChangeInput('cotizado',context);
                }else{//es una tarea nueva
                    sendMessageChangeInput('nuevo',context);
                }
            }
        }
    }
}

function verificarTareaNoCotizada(listMsg,context){
    var tam = listMsg.length;//solo verificamos el ultimo mensaje
    if(tam>0){
        verificarMensajePay(listMsg[tam-1],context);
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