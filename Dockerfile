# Use an official Node.js runtime as a parent image
# Using alpine variant for smaller size
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install app dependencies
# Use --only=production if you don't need devDependencies
RUN npm install

# Bundle app source
# Copy all files from the current directory to the working directory in the container
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define environment variable for the port
# Allows overriding the default port 3000
ENV PORT=3000

# Run the app when the container launches
CMD [ "npm", "start" ]
