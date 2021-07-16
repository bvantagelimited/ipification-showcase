function login_phone(inputPhone){
	var client_id = inputPhone.data('client-id');
	var env = inputPhone.data('env');
	var iat = inputPhone.data('iat');
	var phone_number = inputPhone.val();
	
	if(!phone_number){
		alert("Please enter phone number");
		return;
	}
	var redirectURL = window.ROOT_URL + '/auth?env=' + env + '&client_id=' + client_id + '&phone=' + phone_number + '&iat=' + iat;
	console.log(redirectURL);
	goto_link(redirectURL);

}

function goto_link(url){
	window.location.href = url;
}

$(document).ready(function(){
	$('.info-icon').on('click', function(){
		$('#app_info').modal('show')
	})

	$('.btnLoginPhone').click(function() {
		var parent = $(this).closest('.block-button');
		var inputPhone = parent.find('input');
		login_phone(inputPhone);
	})

	$('input[name=phone]').keypress(function() {
		var keycode = (event.keyCode ? event.keyCode : event.which);
    if(keycode == '13'){
			login_phone($(this));
    }
	})

	$('input[name=phone]').on('input', function(e) {
		$(this).val($(this).val().replace(/[^0-9]/g, ''));
});

	if($('#response_info').length > 0 ){
		$('#response_info').modal('show')
	}
})
