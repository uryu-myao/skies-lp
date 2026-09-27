// Where the "Notify me" form on /pro sends email addresses: Buttondown's embed
// form endpoint. It's a plain HTML POST that opens Buttondown's page in a new
// tab, never fetch (see the script in pro.astro). While this is null the form
// is shown disabled, so nobody signs up into nothing.
//
// Buttondown is named on /privacy ("Pro launch email"). Update that section if
// the form ever posts somewhere else.
export interface NotifyForm {
  action: string;
  emailField: string;
  extraFields?: Record<string, string>;
}

const BUTTONDOWN_USERNAME: string | null = 'uryu';

export const NOTIFY_FORM: NotifyForm | null = BUTTONDOWN_USERNAME
  ? {
      action: `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`,
      emailField: 'email',
      extraFields: { embed: '1' },
    }
  : null;
