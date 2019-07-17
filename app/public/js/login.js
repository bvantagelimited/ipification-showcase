function login_phone(client_id, env){
	var input_phone = document.getElementById('phone');
	var phone_number = input_phone.value;
	
	if(!phone_number){
		alert("Please enter phone number");
		return;
	}

	var redirectURL = window.ROOT_URL + '/auth?env=' + env + '&client_id=' + client_id + '&phone=' + phone_number;
	console.log(redirectURL);
	goto_link(redirectURL);

}

function show_qrcode() {
	$('#qrCode_info').modal('show')
}

function goto_link(url){
	window.location.href = url;
}

$(document).ready(function(){
	$('.info-icon').on('click', function(){
		$('#app_info').modal('show')
	})

	if($('#response_info').length > 0 ){
		$('#response_info').modal('show')
	}
})
