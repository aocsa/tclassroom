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

function onerrorImg(source){
    //alert("error image load");
    source.hidden = true;
}

function sendMessageChangeInput(expense,contexto){
    if(expense.estado=='nuevo'){//El profesor tiene que cotizar
        contexto.$.message_normal.hidden = true;
        contexto.$.message_cotizacion.hidden = false;  
        contexto.$.inputCotizar.enable=true;   
        contexto.$.inputCotizar.disabled = false;
        contexto.$.inputCotizar.label = "Cotizar tarea .."; 
                 
    }
    if(expense.estado=='cotizado'){//Bloqueamos sendmessage para que el alumno responda con el pago
        contexto.$.message_normal.hidden = true;
        contexto.$.message_cotizacion.hidden = false; 
        
        contexto.$.inputCotizar.disabled = true;
        contexto.$.inputCotizar.enable=false; 
        contexto.$.inputCotizar.label = "Esperar a que el alumno realize el pago";
    }

    if(expense.estado=='en progreso'){//puede hablar normalmente
        contexto.$.message_normal.hidden = false;
        contexto.$.message_cotizacion.hidden = true; 
    }
}