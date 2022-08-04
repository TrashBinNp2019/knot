$(document).ready(function() {
  let examined_total = 0;
  let valid_total = 0;
  let log_count = 0;

  function updateSuccess() {
    const rate = valid_total === 0? 0 : valid_total / examined_total;
    if (rate === 0) {
      $('#success-rate').text('0');
    } else {
      $('#success-rate').text(rate < 0.00001? '< 0.001' : (rate * 100).toFixed(3));
    }
  }

  $('.logs').append("<li>Loading...</li>");

  const socket = io();

  socket.on('log', function(data) {
    log_count++;
    let obj = {};
    if (data.startsWith('{')) {
      obj = JSON.parse(data);
    }
    if ('title' in obj && 'addr' in obj && 'contents_length' in obj) {
      $('.logs').append(`<li><a href=${obj.addr}>${obj.title}</a>. Contents length: ${obj.contents_length}</li>`);
    } else { 
      $('.logs').append(`<li>${data}</li>`);
    }
    if (log_count >= 20) {
      $('.logs li:first').remove();
    }
  });

  socket.on('examined', function(total, pm) {
    examined_total = total;
    $('#examined-total').text(examined_total);
    $('#epm').text(parseInt(pm, 0));
    updateSuccess();
  });

  socket.on('valid', function(total, pm) {
    valid_total = total;
    $('#valid-total').text(valid_total);
    $('#vpm').text(parseInt(pm, 0));
    updateSuccess();
  });
});
