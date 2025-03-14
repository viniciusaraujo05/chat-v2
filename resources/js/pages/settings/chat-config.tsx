import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat settings',
        href: '/settings/chat-config',
    },
];

export default function ChatConfig() {
    const apiKeyInput = useRef<HTMLInputElement>(null);
    const botNameInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        api_key: '',
        bot_name: '',
    });

    const updateChatConfig: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('chat-config.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.api_key) {
                    reset('api_key');
                    apiKeyInput.current?.focus();
                }

                if (errors.bot_name) {
                    reset('bot_name');
                    botNameInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Configure Chat" description="Set your chat API key and bot name." />

                    <form onSubmit={updateChatConfig} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="api_key">API Key</Label>

                            <Input
                                id="api_key"
                                ref={apiKeyInput}
                                value={data.api_key}
                                onChange={(e) => setData('api_key', e.target.value)}
                                type="text"
                                className="mt-1 block w-full"
                                placeholder="Enter your API key"
                            />

                            <InputError message={errors.api_key} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="bot_name">Bot Name</Label>

                            <Input
                                id="bot_name"
                                ref={botNameInput}
                                value={data.bot_name}
                                onChange={(e) => setData('bot_name', e.target.value)}
                                type="text"
                                className="mt-1 block w-full"
                                placeholder="Enter your bot name"
                            />

                            <InputError message={errors.bot_name} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save settings</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
