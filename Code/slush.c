/***************************************
*Ben Beshel - 2/3/16
*slush.c
*Emulates a shell in linux.
*Contains builtin for cd, supports pipes
*Handles errors and interrupts
***************************************/

#include <sys/wait.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <signal.h>

//Our delimiter for strtok
#define DELIM " \n"
//We make the number of children global to be accessible
int children = 0;

//Handles the interrupt from keyboard and clears the buffer
void handle_interrupt(int sg) {
	printf("\n");
}

//Our extremely wondeful and completely beautiful piping function
//leftmost is a boolean to determine if we are last argument
int sl_pipes(char **args, int leftmost) {
	//Boolean determining first argument
	int rightmost = 0;
	//our PID for fork
	pid_t pid;
	//File descriptor to return (output)
	int fd_c;
	//Holds our new pipe file descriptors
	int fd[2];
	
	
	//Loops the amount of args
	for(int i = 0; i < sizeof(args); i++){
		if (!args[i]){ // if you reach the end of args you break out of the for loop and execute last arg
			rightmost = 1;
			break;
		}
		if(!strcmp(args[i],"(")){ //is not the last argument
			fd_c = sl_pipes(args + i + 1, 0); //can use &args[i+1]
			//Set the "(" char to NULL for execvp
			args[i] = NULL;
			break;
		}
	}

	//Create a pipe if we are not parent
	if (leftmost == 0) {
		pipe(fd);
	}
	
	//Fork
	pid = fork();
	
	//If we are not the parent of fork
	if (pid == 0) {
		if (leftmost == 1) {
			//Read from child, close read
			dup2(fd_c, STDIN_FILENO);
			close(fd_c);
		} else if (rightmost == 1) {		
			//Write up and close our old pipe
			dup2(fd[1], STDOUT_FILENO);
			close(fd[0]);
			close(fd[1]);	
		} else {
			//Write up, read from child
			dup2(fd[1], STDOUT_FILENO);
			dup2(fd_c, STDIN_FILENO);
			close(fd_c);
			//Close our old pipe
			close(fd[1]);
			close(fd[0]);				
		}
		
		//Exec
		if (execvp(args[0], args) == -1) {
			perror(args[0]);
		}
		exit(errno);
		
	} else if (pid < 0) {
		perror("fork");
	} else {
		//Cleanup
		//Close the write pipe
		if (leftmost == 0) {
			close(fd[1]);
		}
		//Close the child "read from" pipe
		if (rightmost == 0) {
			close(fd_c);
		}
		children++;
		//Return the pipe to be read from
		return fd[0];
	}	
	return 1;
}

//Runs the builtin command "cd" with error handling
int sl_cd(char **args)
{
	if (args[1] == NULL) {
		fprintf(stderr, "slush: no argument for \"cd\"\n");
	} else {
		if (chdir(args[1]) != 0) {
			perror("slush");
		}
	}
	return 1;
}

//Handler to determine if the call is builtin or handled with execvp
int sl_exec(char **args)
{
	if (args[0] == NULL) {
		//Empty command
		return 1;
	}

	//Compare the first arg to see if it is "cd"
	if (strcmp(args[0], "cd") == 0) {
		return sl_cd(args);
	}
	//Otherwise use check for pipe and exec
	return sl_pipes(args, 1);
}


char *sl_read_line(void)
{
	const int MAX_LINE = 256;
	int bufsize = MAX_LINE;
	char *buffer = malloc(sizeof(char) * MAX_LINE);
	int c;

	if (!buffer) {
		fprintf(stderr, "slush: error reading line\n");
		exit(EXIT_FAILURE);
	}

	do {
		if (fgets(buffer,MAX_LINE,stdin)) {
			return buffer;
		} else if (errno == EINTR) {
			printf("slush: ");
		} else {
			printf("\n");
			exit(EXIT_SUCCESS);
		}
	} while (!feof(stdin));
}

//Splits the lines into argument tokens
char **sl_split_line(char *line)
{
	const int MAX_LINE = 256;
	int bufsize = MAX_LINE;
	int position = 0;
	char **tokens = malloc(bufsize * sizeof(char*));
	char *token;

	if (!tokens) {
		perror("malloc");
		exit(errno);
	}

	token = strtok(line, DELIM);
	while (token != NULL) {
		tokens[position] = token;
		position++;
		
		//Reallocate space
		if (position >= bufsize) {
			bufsize += MAX_LINE;
			tokens = realloc(tokens, bufsize * sizeof(char*));
			if (!tokens) {
				perror("malloc");
				exit(EXIT_FAILURE);
			}
		}
		//Continue strtok
		token = strtok(NULL, DELIM);
	}
	tokens[position] = NULL;
	return tokens;
}

void slush(void) {
	char *line;
	char **args;
	int stat;
	size_t MAX_LINE;
	
	stat = 1;
	while(stat) {
		children = 0;
		printf("slush: ");
		
		//Read in the line
		line = sl_read_line();
		
		//Split the line based on delims (for exec)
		args = sl_split_line(line);
		
		//Send to setup for builtin or pipe
		stat = sl_exec(args);

		//Wait for all children
		while(children) {
			wait(NULL);
			children--;
		}
		
		
		//Destroy line
		free(line);
		//Destroy previous tokens
		free(args);
	} 
}

int main(int argc, char **argv) {
	signal(SIGINT, handle_interrupt);
    siginterrupt(SIGINT,1);
	
	//Call read in loop
	slush();
	
	return EXIT_SUCCESS;
}