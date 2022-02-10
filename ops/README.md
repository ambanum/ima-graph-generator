# ima-graph-generator-ops

Recipes to set up the infrastructure for the ima-graph-generator app and deploy it.

> Recettes pour mettre en place l'infrastructure et déployer l'application ima-graph-generator

## Requirements

- Install [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
- `ansible-galaxy collection install community.general`

### [For developement only] Additional dependencies

To test the changes without impacting the production server, a Vagrantfile is provided to test the changes locally in a virtual machine. VirtualBox and Vagrant are therefore required.

- Install [VirtualBox](https://www.vagrantup.com/docs/installation/)
- Install [Vagrant](https://www.vagrantup.com/docs/installation/)

## Usage

To avoid making changes on the production server by mistake, by default all commands will only affect the Vagrant development virtual machine (VM). Note that the VM needs to be started before with `vagrant up`.\
To execute commands on the production server you should specify it by adding the option `--inventory ops/inventories/production.yml` to the following commands:

- To setup a full [(phoenix)](https://martinfowler.com/bliki/PhoenixServer.html) server:

```
ansible-playbook ops/site.yml
```

- To setup infrastructure only:

```
ansible-playbook ops/infra.yml
```

Setting up the production infrastructure for publishing on the shared versions repository entails decrypting a private key managed with [Ansible Vault](https://docs.ansible.com/ansible/latest/user_guide/vault.html). It is decrypted with a password that we keep safe. You do not need to decrypt this specific private key on your own production server.

- To setup `ima-graph-generator` app only:

```
ansible-playbook ops/app.yml
```

Some useful options can be used to:

- see what changed with `--diff`
- simulate execution with `--check`
- see what will be changed with `--check --diff`

### Full commands

Remember that the deployment script will provoke a `git clone` on the server machine, so your data needs to be pushed there.

All possibilities are listed as npm scripts

### Tags

Some tags are available to refine what will happen, use them with `--tags`:

- `setup`: to only setup system dependencies required by the app (cloning repo, installing app dependencies, all config files, and so on…)
- `start`: to start the app
- `stop`: to stop the app
- `restart`: to restart the app
- `update`: to update the app (pull code, install dependencies and restart app)

For example, you can update `ima-graph-generator` by running:

```
ansible-playbook ops/app.yml --tags update
```

### Logs

You can get logs by connecting to the target machine over SSH and obtaining logs from the process manager:

```

```
