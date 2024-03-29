import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const donato = [
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/8da42b09-6399-410b-909a-679e1d6e10c7/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/f1236e00-0e9e-43a1-bbdc-120de4f52722/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/ff23d9bd-f2a2-4031-882f-efb953b621f9/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/76d21643-eeb7-46d8-adfe-ff7b3ab930e7/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/1bd03725-5c14-4dfc-ad8b-b7cee11267da/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/47c986c2-cf25-4b6c-a9e6-bdffeb4f22d1/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/46d07ad3-c67f-4c79-a0af-cddae7d1acd2/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/3fd90aaf-d913-4019-aaab-497ab21dbbb4/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/8580f1c4-2b6e-4a20-b3ac-9cf1ee4c733c/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/29d9f173-2800-4f20-930f-8a7c15ad3192/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/7793bcef-bb04-419d-b465-52d288920fe1/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/3965c10f-60bf-4f4a-b6b0-3681c6ff1f6c/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/9b812044-9156-4e94-8e89-ab668d50cbd3/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/7d89d9d5-980b-4cb0-9e85-0b6c979e90df/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/b6e9b7e3-70e0-4ad9-b966-014bf4d2f91a/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/fd614bd2-df39-4713-8d16-dc8f1de93d0c/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/25af0c46-5262-4b55-9984-81ef5e2c5735/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/07517789-0ecf-4863-a2ee-f8f922983200/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/f3d12cb3-21e2-4734-afba-196ee7299b24/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/13734a75-7a7b-4a2b-9320-7f37b9ef2fe8/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/b5d1957d-f4de-400d-bb3e-1b4ad50f0201/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/7c248e8f-1e37-44cf-b649-3d1da6d74ab7/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/ec6c66f0-ba2e-484f-b72c-e140bf0f714c/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/a1543249-d42f-4cc0-a606-14af5dc55e31/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/f284985a-e33f-4b58-bbe9-ab028edeede8/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/337e2153-3efb-4075-a674-aecad29745a0/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/8331595a-47b7-4da5-9a12-1bd02d5f80b6/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/34834313-42aa-479b-a45a-f28c21cfbde2/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/863f898a-1008-49ea-94ae-4fac5f465427/thumbnails/medium.png',
  'https://cdn.hubblecontent.osi.office.net/m365content/publish/0b1e4dcb-dc62-487c-944c-05fd2dfeb5c6/thumbnails/medium.png',
];

export const donatoCommand = {
  data: new SlashCommandBuilder()
    .setName('donato')
    .setDescription('Send a Donato in the chat!'),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    return interaction.reply(donato[Math.floor(Math.random() * donato.length)]);
  },
};
