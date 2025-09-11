document.addEventListener('DOMContentLoaded', function() {
  // Initialize FullCalendar
  var calendarEl = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 450,
    googleCalendarApiKey: 'AIzaSyCagPtXHd2xMV2LblKMY8fy4ZDx8m81CdU',
    timeZone: 'America/Chicago',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listMonth'
    },
    eventSources: [],
    editable: false,
    navLinks: true
  });
  calendar.render();
  
  // Map team values to calendar IDs and colors
  var teamCalendars = {
    'cal-all': [
      { googleCalendarId: 'e408658bea794c3908bb8e620d6c27467f794bb064ca31b3c7b955d72e971a50@group.calendar.google.com', color: '#8e24aa' },
      { googleCalendarId: 'b03bf84738d4bad238c386513880412e7e9506eaf8b6a290e6ae582ff1978222@group.calendar.google.com', color: '#f6bf26' },
      { googleCalendarId: '6fe906cd12d2404f1e826292c500c83f6c0a7b541b2621f576c704fb0ae7dadb@group.calendar.google.com', color: '#f4511e' },
      { googleCalendarId: '8683fbf12c36a3d66d10bca4cce7906d6b3d935a147f1172ccf94eb771c25792@group.calendar.google.com', color: '#4285f4' },
      { googleCalendarId: '37d07b4e6475e1cf414d96825b7886baf1e1ae158299f122215269933ff647e9@group.calendar.google.com', color: '#0b8043' },
      { googleCalendarId: 'b3a5922e9ca12cd37620498a3ff537b46b80485b5e3e81aa704869fd22775ab6@group.calendar.google.com', color: '#000000' },
      { googleCalendarId: '6d83089dbd7cd48b6cfa929c1a0e216979808ae37b03e91520313ff538e0c29aa@group.calendar.google.com', color: '#9e69af' },
      { googleCalendarId: 'bdd8d47eacde4e2b3c78d6979c6b95cabd777115367e79e82f16f4fda4afb692@group.calendar.google.com', color: '#ff0000' },
      { googleCalendarId: 'en.usa#holiday@group.v.calendar.google.com', color: '#000ac2' }
    ],
    'cal-varsity-boys': [{ googleCalendarId: 'bdd8d47eacde4e2b3c78d6979c6b95cabd777115367e79e82f16f4fda4afb692@group.calendar.google.com', color: '#ff0000' }],
    'cal-jv-girls': [{ googleCalendarId: '6d83089dbd7cd48b6cfa929c1a0e216979808ae37b03e91520313ff538e0c29aa@group.calendar.google.com', color: '#9e69af' }],
    'cal-jv-boys': [{ googleCalendarId: 'b3a5922e9ca12cd37620498a3ff537b46b80485b5e3e81aa704869fd22775ab6@group.calendar.google.com', color: '#000000' }],
    'cal-14u-black': [{ googleCalendarId: '8683fbf12c36a3d66d10bca4cce7906d6b3d935a147f1172ccf94eb771c25792@group.calendar.google.com', color: '#4285f4' }],
    'cal-14u-red': [{ googleCalendarId: '37d07b4e6475e1cf414d96825b7886baf1e1ae158299f122215269933ff647e9@group.calendar.google.com', color: '#0b8043' }],
    'cal-12u-black': [{ googleCalendarId: 'b03bf84738d4bad238c386513880412e7e9506eaf8b6a290e6ae582ff1978222@group.calendar.google.com', color: '#f6bf26' }],
    'cal-12u-red': [{ googleCalendarId: '6fe906cd12d2404f1e826292c500c83f6c0a7b541b2621f576c704fb0ae7dadb@group.calendar.google.com', color: '#f4511e' }],
    'cal-12u-girls': [{ googleCalendarId: 'e408658bea794c3908bb8e620d6c27467f794bb064ca31b3c7b955d72e971a50@group.calendar.google.com', color: '#8e24aa' }]
  };
  
  // Function to load selected calendar(s)
  function loadCalendar(team) {
    calendar.removeAllEventSources();
    var sources = teamCalendars[team] || [];
    sources.forEach(function(source) {
      if (source.googleCalendarId.includes('#holiday')) {
        source.color = '#000ac2';
      }
      calendar.addEventSource(source);
    });
  }
  
  // Handle dropdown change
  var selector = document.getElementById('team-selector');
  selector.addEventListener('change', function() {
    var targetId = this.value;
    loadCalendar(targetId);
    localStorage.setItem('rattlers-team-selection', targetId);
  });
  
  // Restore saved selection or load default
  var saved = localStorage.getItem('rattlers-team-selection');
  if (saved && teamCalendars[saved]) {
    selector.value = saved;
    loadCalendar(saved);
  } else {
    loadCalendar('cal-all');
  }
});