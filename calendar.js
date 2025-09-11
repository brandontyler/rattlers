document.addEventListener('DOMContentLoaded', function() {
  var calendarEl = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 450,
    timeZone: 'America/Chicago',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    eventSources: [
      {
        url: 'https://calendar.google.com/calendar/ical/e408658bea794c3908bb8e620d6c27467f794bb064ca31b3c7b955d72e971a50%40group.calendar.google.com/public/basic.ics',
        color: '#8e24aa' // Matches your original 12U Girls color
      }
    ],
    editable: false,
    navLinks: true
  });
  calendar.render();
});
