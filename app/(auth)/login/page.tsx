import { Divider, Heading, Stack } from '@/components/chakra';
import { Logo } from '@/components/client';

import { LoginByEmail, LoginByGithub } from './components';

const hasGithubProvider = !!process.env.GITHUB_ID && !!process.env.GITHUB_SECRET;
const hasEmailProvider = !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;

export default function LoginPage() {
  return (
    <Stack gap={4} maxWidth="sm" marginX="auto" marginTop="10vh">
      <Logo width={256} height={74} />

      <Heading as="h1" size="lg">
        Login
      </Heading>

      <Divider />

      {hasEmailProvider && <LoginByEmail />}

      {hasGithubProvider && (
        <>
          <Divider />
          <LoginByGithub org={process.env.GITHUB_ORG} />
        </>
      )}
    </Stack>
  );
}
