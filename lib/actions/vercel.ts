'use server';

import { HttpMethod, type JsonObject, type Site, type Project } from '@/types';
import deepmerge from 'deepmerge';

import { TEAM_ID, VERCEL_TOKEN, VERCEL_API_URL } from '../constants';
import { fetcher } from '../utils';
import { checkRepoExisting } from './github';

const defaultOptions = {
  framework: 'nextjs',
  gitRepository: {
    type: 'github',
  },
};

export const removeDomainFromVercel = async (projectId: string, domain: string) => {
  const response = await fetcher(
    `${VERCEL_API_URL}/v10/projects/${projectId}/domains/${domain}?teamId=${TEAM_ID}`,
    {
      method: HttpMethod.DELETE,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  );

  return response;
};

export const addDomainToVercel = async (projectId: string, domain: string) => {
  const response = await fetcher(
    `${VERCEL_API_URL}/v10/projects/${projectId}/domains?teamId=${TEAM_ID}`,
    {
      method: HttpMethod.POST,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      body: JSON.stringify({
        name: domain,
      }),
    }
  );

  return response;
};

export type CreateProjectDto = Site;

export const createProject = async ({
  id,
  environmentVariables,
  subdomain,
}: CreateProjectDto) => {
  const gitRepo = `sieutoc-customers/${id}`;

  const envs = environmentVariables as JsonObject;

  const data = deepmerge(defaultOptions, {
    name: id,
    gitRepository: { repo: gitRepo },
    environmentVariables: [
      {
        key: 'NEXTAUTH_SECRET',
        value: envs.NEXTAUTH_SECRET,
      },
      {
        key: 'ARGON_SECRET',
        value: envs.ARGON_SECRET,
      },
    ].map((o) => ({ ...o, target: 'production', type: 'encrypted' })),
  });

  const response = await fetcher<Project>(
    `${VERCEL_API_URL}/v9/projects?teamId=${TEAM_ID}`,
    {
      method: HttpMethod.POST,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      body: JSON.stringify(data),
    }
  );

  // Update the subdomain, we can not do it with project creation
  if (response && response.id) {
    await addDomainToVercel(response.id, `${subdomain}.sieutoc.website`);
  }

  return response;
};

export const findProject = async (idOrName: string) => {
  const response: any = await fetcher(
    `${VERCEL_API_URL}/v9/projects/${idOrName}?teamId=${TEAM_ID}`,
    {
      method: HttpMethod.GET,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  );

  if (response.error && response.error.code === 'not_found') {
    return null;
  }

  return response as Project;
};

export const deleteProject = async (idOrName: string) => {
  const found = await findProject(idOrName);

  if (!found) {
    return;
  }

  const response = await fetcher(
    `${VERCEL_API_URL}/v9/projects/${found.id}?teamId=${TEAM_ID}`,
    {
      method: HttpMethod.DELETE,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  );

  return response;
};

export type DeployDto = {
  id: string; // Site UUID (used as name)
};
export const createDeployment = async ({ id }: DeployDto) => {
  const existingRepo = await checkRepoExisting(id);

  if (!existingRepo) {
    return;
  }

  const deployResponse = await fetcher(
    `${VERCEL_API_URL}/v13/deployments/?teamId=${TEAM_ID}`,
    {
      method: HttpMethod.POST,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      body: JSON.stringify({
        name: id,
        gitSource: {
          repoId: existingRepo.data.id,
          type: 'github',
          ref: 'master',
        },
        projectSettings: {
          framework: 'nextjs',
        },
      }),
    }
  );

  return deployResponse;
};
