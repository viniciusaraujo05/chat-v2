<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>

    <script>
        window.chatConfig = {
            position: 'right',
            title: 'Chat de Suporte',
            bubbleColor: '#000',
            welcomeMessage: 'Olá {name}! Só na boa?',
            cacheTTL: 24 * 60 * 60 * 1000,
        };
    </script>

    <script src="http://localhost/js/chat-widget.js"></script>
</html>
