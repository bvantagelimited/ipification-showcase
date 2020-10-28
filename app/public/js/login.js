function login_phone(client_id, env, iat){
	var input_phone = document.getElementById('phone');
	var phone_number = input_phone.value;
	
	if(!phone_number){
		alert("Please enter phone number");
		return;
	}
	phone_number = phone_number.replaceAll('+', '')
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

	if($('#response_info').length > 0 ){
		$('#response_info').modal('show')
	}
})
